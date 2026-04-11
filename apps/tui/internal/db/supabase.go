// Package db provides a thin, lower-level Supabase REST helper intended for
// new code that does not go through the higher-level internal/api client.
// It exposes raw GET / POST / PATCH / DELETE helpers that return []byte so
// callers can unmarshal into whatever shape they need.
package db

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Sharann-del/kern/tui/internal/types"
)

// authResp is the raw JSON shape returned by Supabase GoTrue token endpoints.
type authResp struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"` // seconds until expiry
	TokenType    string `json:"token_type"`
	User         struct {
		ID           string `json:"id"`
		Email        string `json:"email"`
		UserMetadata struct {
			FullName string `json:"full_name"`
			Name     string `json:"name"`
		} `json:"user_metadata"`
	} `json:"user"`
}

type signUpResp struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
	User         struct {
		ID           string `json:"id"`
		Email        string `json:"email"`
		Identities   []any  `json:"identities"`
		UserMetadata struct {
			FullName string `json:"full_name"`
			Name     string `json:"name"`
		} `json:"user_metadata"`
	} `json:"user"`
	Session *authResp `json:"session"`
}

func (r *authResp) toSession() *types.Session {
	return &types.Session{
		AccessToken:  r.AccessToken,
		RefreshToken: r.RefreshToken,
		ExpiresAt:    time.Now().UTC().Add(time.Duration(r.ExpiresIn) * time.Second).Unix(),
		TokenType:    r.TokenType,
		User: types.User{
			ID:    r.User.ID,
			Email: r.User.Email,
			Name:  firstNonEmpty(r.User.UserMetadata.FullName, r.User.UserMetadata.Name),
		},
	}
}

func (r *signUpResp) toSession() *types.Session {
	if r.Session != nil {
		return r.Session.toSession()
	}
	if r.AccessToken == "" {
		return nil
	}
	return (&authResp{
		AccessToken:  r.AccessToken,
		RefreshToken: r.RefreshToken,
		ExpiresIn:    r.ExpiresIn,
		TokenType:    r.TokenType,
		User: struct {
			ID           string `json:"id"`
			Email        string `json:"email"`
			UserMetadata struct {
				FullName string `json:"full_name"`
				Name     string `json:"name"`
			} `json:"user_metadata"`
		}{
			ID:    r.User.ID,
			Email: r.User.Email,
			UserMetadata: struct {
				FullName string `json:"full_name"`
				Name     string `json:"name"`
			}{
				FullName: r.User.UserMetadata.FullName,
				Name:     r.User.UserMetadata.Name,
			},
		},
	}).toSession()
}

// SignUp creates an email/password account via GoTrue.
// If email confirmation is enabled, the returned session may be nil.
func (d *DB) SignUp(fullName, email, password string) (*types.Session, error) {
	payload := map[string]any{
		"email":    email,
		"password": password,
	}
	if strings.TrimSpace(fullName) != "" {
		payload["data"] = map[string]string{
			"full_name": fullName,
			"name":      fullName,
		}
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	raw, err := d.doAuth(http.MethodPost, "/auth/v1/signup", nil, body)
	if err != nil {
		return nil, err
	}
	var resp signUpResp
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}
	if resp.Session == nil && resp.AccessToken == "" && resp.User.Email != "" && len(resp.User.Identities) == 0 {
		return nil, fmt.Errorf("User already registered")
	}
	s := resp.toSession()
	if s != nil {
		d.SetAuthToken(s.AccessToken)
	}
	return s, nil
}

// SignIn authenticates with email/password via the GoTrue password grant and
// returns a Session. On success the DB's auth token is updated automatically.
func (d *DB) SignIn(email, password string) (*types.Session, error) {
	body, err := json.Marshal(map[string]string{
		"email":    email,
		"password": password,
	})
	if err != nil {
		return nil, err
	}
	q := url.Values{}
	q.Set("grant_type", "password")
	raw, err := d.doAuth(http.MethodPost, "/auth/v1/token", q, body)
	if err != nil {
		return nil, err
	}
	var resp authResp
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}
	s := resp.toSession()
	d.SetAuthToken(s.AccessToken)
	return s, nil
}

// RefreshToken exchanges a refresh token for a new Session.
// On success the DB's auth token is updated automatically.
func (d *DB) RefreshToken(refreshToken string) (*types.Session, error) {
	body, err := json.Marshal(map[string]string{
		"refresh_token": refreshToken,
	})
	if err != nil {
		return nil, err
	}
	q := url.Values{}
	q.Set("grant_type", "refresh_token")
	raw, err := d.doAuth(http.MethodPost, "/auth/v1/token", q, body)
	if err != nil {
		return nil, err
	}
	var resp authResp
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}
	s := resp.toSession()
	d.SetAuthToken(s.AccessToken)
	return s, nil
}

// ExchangeCode exchanges a PKCE auth code for a Session.
// Used by the OAuth flow after the browser redirects back to the local callback server.
func (d *DB) ExchangeCode(code, verifier string) (*types.Session, error) {
	body, err := json.Marshal(map[string]string{
		"auth_code":     code,
		"code_verifier": verifier,
	})
	if err != nil {
		return nil, err
	}
	q := url.Values{}
	q.Set("grant_type", "pkce")
	raw, err := d.doAuth(http.MethodPost, "/auth/v1/token", q, body)
	if err != nil {
		return nil, err
	}
	var resp authResp
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}
	s := resp.toSession()
	d.SetAuthToken(s.AccessToken)
	return s, nil
}

// SignOut invalidates the current session on the server and clears the local
// auth token. The caller should also delete the persisted session file.
func (d *DB) SignOut() error {
	_, err := d.doAuth(http.MethodPost, "/auth/v1/logout", nil, nil)
	d.SetAuthToken("")
	return err
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

// doAuth sends a request to a GoTrue /auth/v1/ path.
// It is separate from do() because auth endpoints use a different path prefix
// (/auth/v1/) instead of the PostgREST prefix (/rest/v1/).
func (d *DB) doAuth(method, path string, query url.Values, body []byte) ([]byte, error) {
	u, err := url.Parse(d.baseURL + path)
	if err != nil {
		return nil, err
	}
	if len(query) > 0 {
		u.RawQuery = query.Encode()
	}

	var rdr io.Reader
	if len(body) > 0 {
		rdr = bytes.NewReader(body)
	}

	req, err := http.NewRequest(method, u.String(), rdr)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", d.anonKey)
	if d.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+d.authToken)
	}
	if len(body) > 0 {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/json")

	resp, err := d.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("auth %s %s: %s — %s", method, path, resp.Status, strings.TrimSpace(string(respBody)))
	}
	return respBody, nil
}

// DB is a minimal Supabase REST client backed by net/http.
type DB struct {
	baseURL    string
	anonKey    string
	authToken  string
	httpClient *http.Client
}

// New creates a DB helper. authToken may be empty for public-table reads.
func New(baseURL, anonKey, authToken string) *DB {
	return &DB{
		baseURL:   strings.TrimRight(baseURL, "/"),
		anonKey:   anonKey,
		authToken: authToken,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// SetAuthToken replaces the bearer token used for subsequent calls.
func (d *DB) SetAuthToken(token string) {
	d.authToken = token
}

// Get performs a GET against /rest/v1/<table> with optional PostgREST query params.
// Returns the raw response body on 2xx.
func (d *DB) Get(table string, query url.Values) ([]byte, error) {
	return d.do(http.MethodGet, table, query, nil)
}

// Post performs a POST (insert) against /rest/v1/<table>.
// body should be a JSON-encoded []byte.
func (d *DB) Post(table string, query url.Values, body []byte) ([]byte, error) {
	return d.do(http.MethodPost, table, query, body)
}

// Patch performs a PATCH (update) against /rest/v1/<table>.
// query must include a PostgREST filter (e.g. id=eq.<uuid>) to avoid full-table updates.
func (d *DB) Patch(table string, query url.Values, body []byte) ([]byte, error) {
	return d.do(http.MethodPatch, table, query, body)
}

// Delete performs a DELETE against /rest/v1/<table>.
// query must include a PostgREST filter.
func (d *DB) Delete(table string, query url.Values) ([]byte, error) {
	return d.do(http.MethodDelete, table, query, nil)
}

func (d *DB) do(method, table string, query url.Values, body []byte) ([]byte, error) {
	u, err := url.Parse(d.baseURL + "/rest/v1/" + table)
	if err != nil {
		return nil, err
	}
	if len(query) > 0 {
		u.RawQuery = query.Encode()
	}

	var rdr io.Reader
	if len(body) > 0 {
		rdr = bytes.NewReader(body)
	}

	req, err := http.NewRequest(method, u.String(), rdr)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", d.anonKey)
	if d.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+d.authToken)
	}
	if len(body) > 0 {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/json")

	resp, err := d.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("db %s %s: %s — %s", method, table, resp.Status, strings.TrimSpace(string(respBody)))
	}
	return respBody, nil
}

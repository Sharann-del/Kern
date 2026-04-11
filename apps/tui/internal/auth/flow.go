package auth

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Sharann-del/kern/tui/internal/config"
	"github.com/Sharann-del/kern/tui/internal/types"
)

type Config = config.Config
type Session = types.Session
type User = types.User

type AuthState int

const (
	StateUnauthenticated AuthState = iota
	StateAuthenticated
	StateLoading
)

type AuthError struct {
	Code    string
	Message string
}

func (e *AuthError) Error() string {
	if e == nil {
		return ""
	}
	return e.Message
}

var (
	ErrInvalidCredentials = &AuthError{Code: "invalid_credentials", Message: "invalid credentials"}
	ErrEmailTaken         = &AuthError{Code: "email_taken", Message: "email already exists"}
	ErrAccountNotFound    = &AuthError{Code: "account_not_found", Message: "account not found"}
	ErrWeakPassword       = &AuthError{Code: "weak_password", Message: "password is too weak"}
	ErrNetworkFailure     = &AuthError{Code: "network_failure", Message: "network failure"}
)

var authHTTPClient = &http.Client{Timeout: 15 * time.Second}

type authHTTPError struct {
	StatusCode int
	Body       string
}

func (e *authHTTPError) Error() string {
	return fmt.Sprintf("auth http %d: %s", e.StatusCode, e.Body)
}

type authResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
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

func Load() (Session, AuthState, error) {
	session, err := LoadSession()
	if err != nil {
		return Session{}, StateLoading, err
	}
	if session.AccessToken == "" || IsExpired(session) {
		return Session{}, StateUnauthenticated, nil
	}

	cfg, err := config.Load()
	if err != nil {
		return Session{}, StateLoading, err
	}
	if cfg == nil || strings.TrimSpace(cfg.SupabaseURL) == "" || strings.TrimSpace(cfg.SupabaseKey) == "" {
		return Session{}, StateUnauthenticated, nil
	}

	refreshed, err := Refresh(*cfg, session)
	if err != nil {
		_ = DeleteSession()
		return Session{}, StateUnauthenticated, nil
	}
	return refreshed, StateAuthenticated, nil
}

func SignIn(cfg Config, email, password string) (Session, error) {
	session, err := signInRemote(cfg, email, password)
	if err != nil {
		return Session{}, classifyAuthError(err)
	}
	if err := SaveSession(session); err != nil {
		return Session{}, err
	}
	return session, nil
}

func SignUp(cfg Config, email, password, name string) (Session, error) {
	body := map[string]any{
		"email":    strings.TrimSpace(email),
		"password": password,
		"data": map[string]string{
			"full_name": strings.TrimSpace(name),
			"name":      strings.TrimSpace(name),
		},
	}
	if _, err := doAuthJSON(cfg, http.MethodPost, "/auth/v1/signup", nil, body); err != nil {
		return Session{}, classifyAuthError(err)
	}
	session, err := signInRemote(cfg, email, password)
	if err != nil {
		return Session{}, classifyAuthError(err)
	}
	if err := SaveSession(session); err != nil {
		return Session{}, err
	}
	return session, nil
}

func SignOut(cfg Config, session Session) error {
	if strings.TrimSpace(session.AccessToken) != "" {
		if _, err := doAuthJSON(cfg, http.MethodPost, "/auth/v1/logout", nil, map[string]any{}, session.AccessToken); err != nil {
			if !errors.Is(classifyAuthError(err), ErrNetworkFailure) {
				return err
			}
		}
	}
	return DeleteSession()
}

func Refresh(cfg Config, session Session) (Session, error) {
	body := map[string]string{"refresh_token": session.RefreshToken}
	q := url.Values{}
	q.Set("grant_type", "refresh_token")
	respBody, err := doAuthJSON(cfg, http.MethodPost, "/auth/v1/token", q, body)
	if err != nil {
		return Session{}, classifyAuthError(err)
	}
	refreshed, err := decodeSession(respBody)
	if err != nil {
		return Session{}, err
	}
	if err := SaveSession(refreshed); err != nil {
		return Session{}, err
	}
	return refreshed, nil
}

func signInRemote(cfg Config, email, password string) (Session, error) {
	body := map[string]string{
		"email":    strings.TrimSpace(email),
		"password": password,
	}
	q := url.Values{}
	q.Set("grant_type", "password")
	respBody, err := doAuthJSON(cfg, http.MethodPost, "/auth/v1/token", q, body)
	if err != nil {
		return Session{}, err
	}
	return decodeSession(respBody)
}

func doAuthJSON(cfg Config, method, path string, query url.Values, body any, bearer ...string) ([]byte, error) {
	baseURL := strings.TrimRight(cfg.SupabaseURL, "/")
	u, err := url.Parse(baseURL + path)
	if err != nil {
		return nil, err
	}
	if query != nil {
		u.RawQuery = query.Encode()
	}

	var rdr io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		rdr = bytes.NewReader(payload)
	}

	req, err := http.NewRequest(method, u.String(), rdr)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", cfg.SupabaseKey)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if len(bearer) > 0 && strings.TrimSpace(bearer[0]) != "" {
		req.Header.Set("Authorization", "Bearer "+bearer[0])
	}

	resp, err := authHTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, &authHTTPError{
			StatusCode: resp.StatusCode,
			Body:       strings.TrimSpace(string(respBody)),
		}
	}
	return respBody, nil
}

func decodeSession(respBody []byte) (Session, error) {
	var resp authResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return Session{}, err
	}
	return Session{
		AccessToken:  resp.AccessToken,
		RefreshToken: resp.RefreshToken,
		ExpiresAt:    time.Now().Add(time.Duration(resp.ExpiresIn) * time.Second).Unix(),
		TokenType:    resp.TokenType,
		User: User{
			ID:    resp.User.ID,
			Email: resp.User.Email,
			Name:  firstNonEmpty(resp.User.UserMetadata.FullName, resp.User.UserMetadata.Name),
		},
	}, nil
}

func classifyAuthError(err error) error {
	if err == nil {
		return nil
	}
	var netErr net.Error
	if errors.As(err, &netErr) {
		return ErrNetworkFailure
	}
	var httpErr *authHTTPError
	if !errors.As(err, &httpErr) {
		return err
	}
	body := strings.ToLower(httpErr.Body)
	switch {
	case httpErr.StatusCode == http.StatusUnprocessableEntity:
		return ErrAccountNotFound
	case httpErr.StatusCode == http.StatusBadRequest && strings.Contains(body, "invalid login credentials"):
		return ErrInvalidCredentials
	case httpErr.StatusCode == http.StatusBadRequest && strings.Contains(body, "user already registered"):
		return ErrEmailTaken
	case httpErr.StatusCode == http.StatusBadRequest && strings.Contains(body, "password should be at least"):
		return ErrWeakPassword
	default:
		return err
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

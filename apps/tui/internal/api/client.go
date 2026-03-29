package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Client is a Supabase REST + Auth HTTP client.
type Client struct {
	baseURL    string
	anonKey    string
	authToken  string
	httpClient *http.Client
}

// New builds a client. authToken may be empty for unauthenticated calls (e.g. sign-in).
func New(baseURL, anonKey, authToken string) *Client {
	baseURL = strings.TrimRight(baseURL, "/")
	return &Client{
		baseURL:   baseURL,
		anonKey:   anonKey,
		authToken: authToken,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// SetAuthToken updates the bearer token used for REST calls.
func (c *Client) SetAuthToken(token string) {
	c.authToken = token
}

func (c *Client) doJSON(method, path string, query url.Values, body any, out any) error {
	u, err := url.Parse(c.baseURL + path)
	if err != nil {
		return err
	}
	if query != nil {
		u.RawQuery = query.Encode()
	}
	var rdr io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		rdr = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, u.String(), rdr)
	if err != nil {
		return err
	}
	req.Header.Set("apikey", c.anonKey)
	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if out != nil && (method == http.MethodPost || method == http.MethodPatch) {
		req.Header.Set("Prefer", "return=representation")
	}
	if method == http.MethodGet || method == http.MethodHead || method == http.MethodDelete {
		req.Header.Set("Accept", "application/json")
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("api %s %s: %s — %s", method, path, resp.Status, strings.TrimSpace(string(respBody)))
	}
	if out == nil || len(respBody) == 0 {
		return nil
	}
	return json.Unmarshal(respBody, out)
}

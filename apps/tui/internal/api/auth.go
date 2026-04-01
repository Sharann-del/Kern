package api

import (
	"net/http"
	"net/url"
)

// AuthResponse is returned by password grant.
type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	} `json:"user"`
}

// SignIn performs email/password auth against GoTrue.
func SignIn(baseURL, anonKey, email, password string) (*AuthResponse, error) {
	c := New(baseURL, anonKey, "")
	q := url.Values{}
	q.Set("grant_type", "password")
	var out AuthResponse
	err := c.doJSON(http.MethodPost, "/auth/v1/token", q, map[string]string{
		"email":    email,
		"password": password,
	}, &out)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

// RefreshSession uses a refresh token to get a new access token.
func RefreshSession(baseURL, anonKey, refreshToken string) (*AuthResponse, error) {
	c := New(baseURL, anonKey, "")
	q := url.Values{}
	q.Set("grant_type", "refresh_token")
	var out AuthResponse
	err := c.doJSON(http.MethodPost, "/auth/v1/token", q, map[string]string{
		"refresh_token": refreshToken,
	}, &out)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

// SignOut invalidates the session on the server.
func SignOut(baseURL, anonKey, accessToken string) error {
	c := New(baseURL, anonKey, accessToken)
	return c.doJSON(http.MethodPost, "/auth/v1/logout", nil, map[string]any{}, nil)
}

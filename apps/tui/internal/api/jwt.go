package api

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
)

// UserIDFromAccessToken returns the JWT "sub" claim without verifying the signature.
func UserIDFromAccessToken(token string) (string, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return "", errors.New("empty token")
	}
	parts := strings.Split(token, ".")
	if len(parts) < 2 {
		return "", errors.New("invalid jwt")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		payload, err = base64.URLEncoding.DecodeString(parts[1])
	}
	if err != nil {
		return "", err
	}
	var claims struct {
		Sub string `json:"sub"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return "", err
	}
	if claims.Sub == "" {
		return "", errors.New("missing sub")
	}
	return claims.Sub, nil
}

package auth

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"time"
)

func sessionPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".kern", "session.json"), nil
}

func SaveSession(s Session) error {
	if s.AccessToken == "" {
		return errors.New("auth: cannot save empty session")
	}
	path, err := sessionPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	body, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, body, 0o600)
}

func LoadSession() (Session, error) {
	path, err := sessionPath()
	if err != nil {
		return Session{}, err
	}
	body, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return Session{}, nil
		}
		return Session{}, err
	}
	var s Session
	if err := json.Unmarshal(body, &s); err != nil {
		return Session{}, err
	}
	return s, nil
}

func DeleteSession() error {
	path, err := sessionPath()
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func IsExpired(s Session) bool {
	return s.ExpiresAt <= time.Now().Unix()
}

package auth

import (
	"errors"

	"github.com/Sharann-del/kern/tui/internal/db"
	"github.com/Sharann-del/kern/tui/internal/types"
)

func Save(s *types.Session) error {
	if s == nil {
		return errors.New("auth: cannot save nil session")
	}
	return SaveSession(*s)
}

func Clear() error {
	return DeleteSession()
}

func IsAuthenticated(s *types.Session) bool {
	if s == nil || s.AccessToken == "" {
		return false
	}
	return !IsExpired(*s)
}

func LoadAndRefresh(_ *db.DB) (*types.Session, error) {
	session, state, err := Load()
	if err != nil {
		return nil, err
	}
	if state != StateAuthenticated || session.AccessToken == "" {
		return nil, nil
	}
	return &session, nil
}

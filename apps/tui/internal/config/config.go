package config

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

// Config holds Supabase connection and session data for the TUI.
type Config struct {
	SupabaseURL  string `json:"supabase_url"`
	SupabaseKey  string `json:"supabase_anon_key"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	Email        string `json:"email"`
}

func configPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".kern", "config.json"), nil
}

// Load reads ~/.kern/config.json.
func Load() (*Config, error) {
	p, err := configPath()
	if err != nil {
		return nil, err
	}
	b, err := os.ReadFile(p)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return &Config{}, nil
		}
		return nil, err
	}
	var c Config
	if err := json.Unmarshal(b, &c); err != nil {
		return nil, err
	}
	return &c, nil
}

// Save writes cfg to ~/.kern/config.json with 0600 permissions.
func Save(cfg *Config) error {
	if cfg == nil {
		return errors.New("nil config")
	}
	p, err := configPath()
	if err != nil {
		return err
	}
	dir := filepath.Dir(p)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	b, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(p, b, 0o600)
}

// Clear removes the config file (logout).
func Clear() error {
	p, err := configPath()
	if err != nil {
		return err
	}
	if err := os.Remove(p); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

// IsAuthenticated reports whether an access token is stored.
func (c *Config) IsAuthenticated() bool {
	return c != nil && c.AccessToken != ""
}

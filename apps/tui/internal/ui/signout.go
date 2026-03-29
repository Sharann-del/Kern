package ui

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/kern/kern-tui/internal/api"
	"github.com/kern/kern-tui/internal/config"
)

func signOutCmd(cfg *config.Config) tea.Cmd {
	return func() tea.Msg {
		if cfg != nil && cfg.AccessToken != "" && cfg.SupabaseURL != "" && cfg.SupabaseKey != "" {
			_ = api.SignOut(cfg.SupabaseURL, cfg.SupabaseKey, cfg.AccessToken)
		}
		_ = config.Clear()
		return signedOutMsg{}
	}
}

package cmd

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/kern/kern-tui/internal/ui"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "kern",
	Short: "Kern terminal UI",
	RunE: func(cmd *cobra.Command, args []string) error {
		p := tea.NewProgram(
			ui.NewAppModel(),
			tea.WithAltScreen(),
			tea.WithMouseCellMotion(),
		)
		if _, err := p.Run(); err != nil {
			return err
		}
		return nil
	},
}

// Execute runs the root command.
func Execute() error {
	return rootCmd.Execute()
}

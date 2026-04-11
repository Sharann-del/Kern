package cmd

import (
	"os"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/joho/godotenv"
	"github.com/spf13/cobra"

	"github.com/Sharann-del/kern/tui/internal/ui"
)

var rootCmd = &cobra.Command{
	Use:   "kern",
	Short: "Kern terminal UI",
	RunE: func(cmd *cobra.Command, args []string) error {
		// Load .env from the working directory.  Silently ignore if absent —
		// env vars set in the shell take precedence over the file.
		_ = godotenv.Load()

		p := tea.NewProgram(
			ui.NewAppModel(
				os.Getenv("SUPABASE_URL"),
				os.Getenv("SUPABASE_ANON_KEY"),
			),
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

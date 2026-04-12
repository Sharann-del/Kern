package statusbar

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

var (
	colorSynced = lipgloss.Color("#1D9E75")
	colorUnsync = lipgloss.Color("#4A4A46")
	colorText   = lipgloss.Color("#6B6B64")
	colorHint   = lipgloss.Color("#2a2825")
	colorKey    = lipgloss.Color("#3d3a37")
)

// Render returns a one-line status bar string exactly width chars wide.
//
// Left segment: sync dot + workspace name + item count.
// Right segment: keybind hints with keys highlighted slightly brighter than labels.
func Render(width int, workspaceName string, repoCount int, synced bool) string {
	if width < 10 {
		return ""
	}

	// ── Left: sync indicator + workspace + count ──────────
	dotColor := colorUnsync
	if synced {
		dotColor = colorSynced
	}
	dot := lipgloss.NewStyle().Foreground(dotColor).Render("●")

	ws := workspaceName
	if ws == "" {
		ws = "—"
	}
	leftLabel := fmt.Sprintf("%s  %d", ws, repoCount)
	left := dot + " " + lipgloss.NewStyle().Foreground(colorText).Render(leftLabel)

	// ── Right: keybind hints ──────────────────────────────
	keyStyle := lipgloss.NewStyle().Foreground(colorKey)
	hintStyle := lipgloss.NewStyle().Foreground(colorHint)
	sep := hintStyle.Render(" · ")

	hints := []string{
		keyStyle.Render("j/k") + hintStyle.Render(" navigate"),
		keyStyle.Render(":") + hintStyle.Render(" command"),
		keyStyle.Render("tab") + hintStyle.Render(" view"),
		keyStyle.Render("?") + hintStyle.Render(" help"),
	}
	right := strings.Join(hints, sep)

	// ── Assemble ──────────────────────────────────────────
	leftW := lipgloss.Width(left)
	rightW := lipgloss.Width(right)
	// 2 chars of outer padding (1 each side via PaddingLeft/Right below)
	available := width - leftW - rightW - 2
	if available < 1 {
		available = 1
	}

	line := left + strings.Repeat(" ", available) + right

	return lipgloss.NewStyle().
		PaddingLeft(1).
		PaddingRight(1).
		Width(width).
		Render(line)
}

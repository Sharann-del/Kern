package ui

import (
	"os"
	"strconv"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// Viewport insets keep the TUI below terminal tabs/title chrome and off the bottom edge.
// Top default is generous for macOS window frames that overlap the first screen rows.
const (
	ViewportInsetTop    = 6
	ViewportInsetBottom = 2
	ViewportInsetX      = 1
)

// EffectiveViewportTop returns ViewportInsetTop, or KERN_TUI_TOP_INSET (0–40) when set.
func EffectiveViewportTop() int {
	if s := os.Getenv("KERN_TUI_TOP_INSET"); s != "" {
		if v, err := strconv.Atoi(strings.TrimSpace(s)); err == nil && v >= 0 && v <= 40 {
			return v
		}
	}
	return ViewportInsetTop
}

var (
	BorderSubtle  = lipgloss.Color("#2A2A28")
	BorderDefault = lipgloss.Color("#373735")
	BorderStrong  = lipgloss.Color("#484845")

	TextPrimary   = lipgloss.Color("#F5F4F0")
	TextSecondary = lipgloss.Color("#A8A89E")
	TextTertiary  = lipgloss.Color("#6B6B64")
	TextMuted     = lipgloss.Color("#4A4A46")

	Gold    = lipgloss.Color("#C8A84B")
	GoldDim = lipgloss.Color("#8A6A20")

	Red   = lipgloss.Color("#C8524A")
	Green = lipgloss.Color("#5A9E6A")
	Blue  = lipgloss.Color("#5A7EC8")
)

// SharpBorder is box-drawing with square corners (no ╭╮╰╯ curves).
var SharpBorder = lipgloss.Border{
	Top:         "─",
	Bottom:      "─",
	Left:        "│",
	Right:       "│",
	TopLeft:     "┌",
	TopRight:    "┐",
	BottomLeft:  "└",
	BottomRight: "┘",
}

var (
	PanelStyle = lipgloss.NewStyle().
			Border(SharpBorder).
			BorderForeground(BorderDefault).
			Padding(0, 1)

	ActivePanelStyle = PanelStyle.Copy().BorderForeground(Gold)

	TitleStyle = lipgloss.NewStyle().
			Foreground(TextPrimary).
			Bold(true)

	SubtitleStyle = lipgloss.NewStyle().
			Foreground(TextTertiary)

	GoldStyle = lipgloss.NewStyle().
			Foreground(Gold).
			Bold(true)

	SelectedItemStyle = lipgloss.NewStyle().
				Foreground(Gold).
				Bold(true).
				PaddingLeft(1)

	NormalItemStyle = lipgloss.NewStyle().
			Foreground(TextSecondary).
			PaddingLeft(1)

	StatusBarStyle = lipgloss.NewStyle().
			Foreground(TextTertiary).
			PaddingLeft(2).
			PaddingRight(2)

	KeyHintStyle = lipgloss.NewStyle().
			Foreground(Gold).
			Bold(true).
			PaddingLeft(0).
			PaddingRight(0)

	ErrorStyle = lipgloss.NewStyle().Foreground(Red)
	DimStyle   = lipgloss.NewStyle().Foreground(TextTertiary)
)

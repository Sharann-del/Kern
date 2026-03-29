package ui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
	kernconfig "github.com/kern/kern-tui/internal/config"
	"github.com/kern/kern-tui/internal/keys"
)

const (
	accountMenuSettings = iota
	accountMenuShortcuts
	accountMenuSignOut
)

func accountMenuLabels() []string {
	return []string{
		"Settings",
		"Keyboard shortcuts",
		"Sign out",
	}
}

func renderAccountMenu(d *DashboardModel, maxW, maxH int) string {
	labels := accountMenuLabels()
	email := ""
	name := "Account"
	if d.cfg != nil {
		email = d.cfg.Email
	}
	boxW := min(44, maxW-4)
	if boxW < 28 {
		boxW = maxW - 4
	}
	var b strings.Builder
	b.WriteString(TitleStyle.Render(name))
	b.WriteString("\n")
	if email != "" {
		b.WriteString(SubtitleStyle.Render(truncate(email, boxW-2)))
		b.WriteString("\n\n")
	}
	for i, lab := range labels {
		var line string
		if i == d.accountMenuIdx {
			line = GoldStyle.Render("▶ " + lab)
		} else {
			line = lipgloss.NewStyle().Foreground(TextSecondary).Render("  " + lab)
		}
		b.WriteString(truncateVisual(line, boxW))
		b.WriteString("\n")
	}
	b.WriteString("\n")
	b.WriteString(DimStyle.Render("[Enter] select  [Esc] close"))
	fr := lipgloss.NewStyle().
		Width(boxW).
		Border(SharpBorder).
		BorderForeground(Gold).
		Padding(1, 2).
		Render(strings.TrimRight(b.String(), "\n"))
	return lipgloss.Place(maxW, maxH, lipgloss.Center, lipgloss.Center, fr)
}

func renderSettingsOverlay(cfg *kernconfig.Config, maxW, maxH int) string {
	url := ""
	if cfg != nil {
		url = strings.TrimSpace(cfg.SupabaseURL)
	}
	p1 := "Full account and workspace settings (themes, data export, integrations, danger zone) are available in the Kern web or desktop app, using this same Supabase project."
	p2 := "Project  " + truncate(url, min(maxW-8, 52))
	body := TitleStyle.Render("Settings") + "\n\n" +
		SubtitleStyle.Render(p1) + "\n\n" +
		SubtitleStyle.Render(p2) + "\n\n" +
		DimStyle.Render("Press Esc to go back.")
	box := lipgloss.NewStyle().
		Width(min(maxW-4, 58)).
		Border(SharpBorder).
		BorderForeground(BorderDefault).
		Padding(1, 2).
		Render(body)
	return lipgloss.Place(maxW, maxH, lipgloss.Center, lipgloss.Center, box)
}

func shortcutRow(label, key string, labelW int) string {
	l := lipgloss.NewStyle().Width(labelW).Align(lipgloss.Left).Foreground(TextTertiary).Render(label)
	k := KeyHintStyle.Render(key)
	return l + k
}

func renderShortcutsOverlay(maxW, maxH int) string {
	const lw = 22
	var sec strings.Builder
	sec.WriteString(lipgloss.NewStyle().Foreground(TextMuted).Bold(true).Render("GLOBAL"))
	sec.WriteString("\n")
	sec.WriteString(shortcutRow("Help", "["+keys.Help+"]", lw))
	sec.WriteString("\n")
	sec.WriteString(shortcutRow("Account menu", "["+keys.AccountMenu+"]", lw))
	sec.WriteString("\n")
	sec.WriteString(shortcutRow("Close overlay / menu", "[Esc]", lw))
	sec.WriteString("\n\n")
	sec.WriteString(lipgloss.NewStyle().Foreground(TextMuted).Bold(true).Render("LAYOUT"))
	sec.WriteString("\n")
	sec.WriteString(shortcutRow("Focus next panel", "[Tab]", lw))
	sec.WriteString("\n")
	sec.WriteString(shortcutRow("Move selection", "[j] [k] or arrows", lw))
	sec.WriteString("\n\n")
	sec.WriteString(lipgloss.NewStyle().Foreground(TextMuted).Bold(true).Render("COLLECTIONS"))
	sec.WriteString("\n")
	sec.WriteString(shortcutRow("New / delete / rename", "[n] [d] [r]", lw))
	sec.WriteString("\n\n")
	sec.WriteString(lipgloss.NewStyle().Foreground(TextMuted).Bold(true).Render("ROWS"))
	sec.WriteString("\n")
	sec.WriteString(shortcutRow("New / delete / edit", "[n] [d] [e]", lw))
	sec.WriteString("\n")
	sec.WriteString(shortcutRow("Search / fields", "[/]  [f]", lw))
	sec.WriteString("\n\n")
	sec.WriteString(lipgloss.NewStyle().Foreground(TextMuted).Bold(true).Render("PREVIEW"))
	sec.WriteString("\n")
	sec.WriteString(shortcutRow("Scroll", "[j] [k]", lw))
	sec.WriteString("\n\n")
	sec.WriteString(lipgloss.NewStyle().Foreground(TextMuted).Bold(true).Render("APP"))
	sec.WriteString("\n")
	sec.WriteString(shortcutRow("Quit", "["+keys.Quit+"]  Ctrl+C", lw))
	sec.WriteString("\n")
	title := TitleStyle.Render("Keyboard shortcuts")
	content := title + "\n\n" + sec.String() + "\n" + DimStyle.Render("Press Esc to close.")
	box := lipgloss.NewStyle().
		Width(min(maxW-4, 56)).
		Border(SharpBorder).
		BorderForeground(Gold).
		Padding(1, 2).
		Render(content)
	return lipgloss.Place(maxW, maxH, lipgloss.Center, lipgloss.Center, box)
}

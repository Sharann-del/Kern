package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/Sharann-del/kern/tui/internal/api"
)

func renderFieldsViewMiddle(d *DashboardModel, innerH, innerW int) string {
	style := ActivePanelStyle.Copy().Width(innerW).Height(innerH)
	if d.focusedPanel != 1 {
		style = PanelStyle.Copy().Width(innerW).Height(innerH)
	}
	name := ""
	if d.selectedColIdx >= 0 && d.selectedColIdx < len(d.collections) {
		name = d.collections[d.selectedColIdx].Name
	}
	title := TitleStyle.Render("Fields — " + name)
	sep := lipgloss.NewStyle().Foreground(BorderSubtle).Render(strings.Repeat("─", max(8, innerW-4)))
	lines := []string{title, sep}
	maxItems := innerH - 6
	if maxItems < 1 {
		maxItems = 1
	}
	for i, f := range d.fields {
		if i >= maxItems {
			lines = append(lines, DimStyle.Render("…"))
			break
		}
		prefix := "  "
		if i == d.selectedFieldIdx {
			prefix = "▶ "
		}
		line := fmtRow(f, prefix, innerW)
		var st lipgloss.Style
		if i == d.selectedFieldIdx {
			st = lipgloss.NewStyle().Foreground(Gold).Bold(true)
		} else {
			st = lipgloss.NewStyle().Foreground(TextSecondary)
		}
		lines = append(lines, truncateVisual(st.Render(line), innerW))
	}
	lines = append(lines, sep)
	lines = append(lines, DimStyle.Render("[n]ew  [d]elete  [Esc] back"))
	body := strings.Join(lines, "\n")
	return style.Render(body)
}

func fmtRow(f api.Field, prefix string, innerW int) string {
	typ := f.Type
	star := ""
	if f.IsPrimary {
		star = " ★ primary"
	}
	base := fmt.Sprintf("%s%-14s %-12s%s", prefix, truncate(f.Name, 12), typ, star)
	return base
}

package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

func renderCollectionsPanel(d *DashboardModel, innerH, innerW int) string {
	if innerH < 1 || innerW < 3 {
		return ""
	}
	style := PanelStyle.Copy().Width(innerW).Height(innerH)
	if d.focusedPanel == 0 && !d.overlayActive() {
		style = ActivePanelStyle.Copy().Width(innerW).Height(innerH)
	}
	title := TitleStyle.Render("Collections")
	lines := []string{title, ""}
	maxItems := innerH - 3
	if maxItems < 1 {
		return style.Render(strings.Join(lines, "\n"))
	}
	for i, c := range d.collections {
		if i >= maxItems {
			lines = append(lines, DimStyle.Render("…"))
			break
		}
		prefix := "  "
		if i == d.selectedColIdx {
			prefix = "▶ "
		}
		cnt := fmt.Sprintf("%d", c.RowCount())
		const cntW = 5
		cntPadded := lipgloss.NewStyle().Width(cntW).Align(lipgloss.Right).Foreground(TextTertiary).Render(cnt)
		badges := ""
		if c.IsLiveSource {
			badges += GoldStyle.Render(" ⟳")
		}
		if c.SyncStatus == "error" {
			badges += lipgloss.NewStyle().Foreground(Red).Render(" !")
		}
		nameBudget := innerW - lipgloss.Width(prefix) - lipgloss.Width(cntPadded) - lipgloss.Width(badges)
		if nameBudget < 4 {
			nameBudget = 4
		}
		name := truncateVisual(c.Name, nameBudget)

		line := prefix + name + badges + cntPadded

		var st lipgloss.Style
		if i == d.selectedColIdx {
			if d.focusedPanel == 0 && !d.overlayActive() {
				st = lipgloss.NewStyle().Foreground(Gold).Bold(true)
			} else {
				st = lipgloss.NewStyle().Foreground(TextPrimary).Bold(true)
			}
		} else {
			st = lipgloss.NewStyle().Foreground(TextSecondary)
		}
		lines = append(lines, st.Render(truncateVisual(line, innerW)))
	}
	if len(d.collections) == 0 && !d.loading {
		lines = append(lines, DimStyle.Render("No collections"))
	}
	body := strings.Join(lines, "\n")
	return style.Render(body)
}

func truncate(s string, max int) string {
	if max <= 0 {
		return ""
	}
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	if max <= 1 {
		return string(r[:1])
	}
	return string(r[:max-1]) + "…"
}

func truncateVisual(s string, maxW int) string {
	if lipgloss.Width(s) <= maxW {
		return s
	}
	r := []rune(s)
	for len(r) > 0 && lipgloss.Width(string(r)+"…") > maxW {
		r = r[:len(r)-1]
	}
	return string(r) + "…"
}

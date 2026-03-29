package ui

import (
	"strings"
)

func renderPreviewPanel(d *DashboardModel, innerH, innerW int) string {
	if innerH < 1 || innerW < 3 {
		return ""
	}
	style := PanelStyle.Copy().Width(innerW).Height(innerH)
	if d.focusedPanel == 2 && !d.overlayActive() {
		style = ActivePanelStyle.Copy().Width(innerW).Height(innerH)
	}
	title := TitleStyle.Render("Preview")
	lines := previewLines(d, innerW-4)
	all := strings.Join(lines, "\n")
	split := strings.Split(all, "\n")
	visible := innerH - 2
	if visible < 1 {
		visible = 1
	}
	start := d.previewScroll
	if start < 0 {
		start = 0
	}
	if len(split) > visible {
		if start > len(split)-visible {
			start = max(0, len(split)-visible)
		}
		end := start + visible
		if end > len(split) {
			end = len(split)
		}
		split = split[start:end]
	}
	body := title + "\n" + strings.Join(split, "\n")
	return style.Render(body)
}

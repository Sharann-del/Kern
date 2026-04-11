package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/Sharann-del/kern/tui/internal/api"
)

func primarySecondarySlugs(fields []api.Field) (primary string, secondary string) {
	for _, f := range fields {
		if f.IsPrimary {
			primary = f.Slug
			break
		}
	}
	for _, f := range fields {
		if f.Slug != primary {
			secondary = f.Slug
			break
		}
	}
	return primary, secondary
}

func cellString(data map[string]any, slug string) string {
	if data == nil || slug == "" {
		return ""
	}
	v, ok := data[slug]
	if !ok || v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	case float64:
		return fmt.Sprint(t)
	case bool:
		if t {
			return "true"
		}
		return "false"
	default:
		return fmt.Sprint(t)
	}
}

func renderRowsPanel(d *DashboardModel, innerH, innerW int) string {
	if innerH < 1 || innerW < 3 {
		return ""
	}
	style := PanelStyle.Copy().Width(innerW).Height(innerH)
	if d.showFieldsView {
		return renderFieldsViewMiddle(d, innerH, innerW)
	}
	if d.focusedPanel == 1 && !d.overlayActive() {
		style = ActivePanelStyle.Copy().Width(innerW).Height(innerH)
	}
	title := TitleStyle.Render("Rows")
	lines := []string{title, ""}
	primary, secondary := primarySecondarySlugs(d.fields)
	rows := d.visibleRows()
	maxItems := innerH - 4
	if d.searchMode {
		maxItems--
	}
	if maxItems < 1 {
		maxItems = 1
	}
	start := 0
	if len(rows) > maxItems {
		// scroll so selection stays visible
		if d.selectedRowIdx >= maxItems {
			start = d.selectedRowIdx - maxItems + 1
		}
	}
	for i := start; i < len(rows) && i < start+maxItems; i++ {
		r := rows[i]
		prefix := "  "
		if i == d.selectedRowIdx {
			prefix = "> "
		}
		left := cellString(r.Data, primary)
		if left == "" {
			left = "(empty)"
		}
		left = truncate(left, innerW/2)
		sec := cellString(r.Data, secondary)
		sec = truncate(sec, innerW/4)
		secStyled := ""
		if sec != "" {
			secStyled = lipgloss.NewStyle().Foreground(TextTertiary).Render(" · " + sec)
		}
		line := prefix + left + secStyled
		var st lipgloss.Style
		if i == d.selectedRowIdx {
			st = SelectedItemStyle
		} else {
			st = NormalItemStyle
		}
		lines = append(lines, truncateVisual(st.Render(line), innerW))
	}
	if len(rows) == 0 && !d.rowsLoading {
		lines = append(lines, DimStyle.Render("No rows"))
	}
	if d.rowsLoading {
		lines = append(lines, DimStyle.Render("Loading…"))
	}
	if d.searchMode {
		q := d.searchInput.View()
		lines = append(lines, "")
		lines = append(lines, SubtitleStyle.Render("Search: ")+q)
	}
	body := strings.Join(lines, "\n")
	return style.Render(body)
}

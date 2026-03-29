package ui

import (
	"encoding/json"
	"fmt"
	"html"
	"regexp"
	"strings"

	"github.com/charmbracelet/glamour"
	"github.com/charmbracelet/lipgloss"
	"github.com/kern/kern-tui/internal/api"
)

var htmlTagRe = regexp.MustCompile(`<[^>]*>`)

func stripRichHTML(s string) string {
	s = htmlTagRe.ReplaceAllString(s, "")
	return html.UnescapeString(strings.TrimSpace(s))
}

func previewLines(d *DashboardModel, maxW int) []string {
	if d == nil || len(d.collections) == 0 || d.selectedColIdx < 0 || d.selectedColIdx >= len(d.collections) {
		return []string{DimStyle.Render("No collection")}
	}
	rows := d.visibleRows()
	if len(rows) == 0 {
		return []string{DimStyle.Render("No rows")}
	}
	if d.selectedRowIdx < 0 || d.selectedRowIdx >= len(rows) {
		return []string{DimStyle.Render("No row selected")}
	}
	row := rows[d.selectedRowIdx]
	var lines []string
	sep := lipgloss.NewStyle().Foreground(BorderSubtle).Render(strings.Repeat("─", max(8, maxW-2)))

	for _, f := range d.fields {
		nameLine := lipgloss.NewStyle().Foreground(TextTertiary).Render(strings.ToUpper(f.Name))
		val := formatFieldValue(f, row.Data[f.Slug], maxW)
		valLines := strings.Split(val, "\n")
		lines = append(lines, nameLine, valLines[0])
		for i := 1; i < len(valLines); i++ {
			lines = append(lines, valLines[i])
		}
		lines = append(lines, sep)
	}
	if len(lines) > 0 {
		lines = lines[:len(lines)-1]
	}
	return lines
}

func formatFieldValue(f api.Field, raw any, maxW int) string {
	if raw == nil {
		return DimStyle.Render("—")
	}
	if maxW < 20 {
		maxW = 72
	}
	switch f.Type {
	case "boolean":
		b, ok := raw.(bool)
		if !ok {
			return fmt.Sprint(raw)
		}
		if b {
			return lipgloss.NewStyle().Foreground(Green).Render("✓ true")
		}
		return lipgloss.NewStyle().Foreground(Red).Render("✗ false")
	case "number":
		return lipgloss.NewStyle().Align(lipgloss.Right).Width(12).Render(fmt.Sprint(raw))
	case "date", "datetime":
		return fmt.Sprint(raw)
	case "select":
		return formatSelectSingle(f, raw)
	case "multi_select":
		return formatSelectMulti(f, raw)
	case "rich_text":
		s, _ := raw.(string)
		plain := stripRichHTML(s)
		if plain == "" {
			return DimStyle.Render("—")
		}
		r, err := glamour.NewTermRenderer(
			glamour.WithStandardStyle("dark"),
			glamour.WithWordWrap(maxW),
		)
		if err != nil {
			return plain
		}
		out, err := r.Render(plain)
		if err != nil {
			return plain
		}
		return strings.TrimSpace(out)
	case "url", "email", "phone", "text", "relation", "file":
		return fmt.Sprint(raw)
	default:
		return fmt.Sprint(raw)
	}
}

type selectOptions struct {
	Items []struct {
		ID    string `json:"id"`
		Label string `json:"label"`
		Color string `json:"color"`
	} `json:"items"`
}

func parseSelectOptions(f api.Field) selectOptions {
	var o selectOptions
	if len(f.Options) == 0 {
		return o
	}
	_ = json.Unmarshal(f.Options, &o)
	return o
}

func formatSelectSingle(f api.Field, raw any) string {
	id := fmt.Sprint(raw)
	opts := parseSelectOptions(f)
	for _, it := range opts.Items {
		if it.ID == id {
			dot := lipgloss.NewStyle().Foreground(lipgloss.Color(it.Color)).Render("●")
			return dot + " " + it.Label
		}
	}
	return "● " + id
}

func formatSelectMulti(f api.Field, raw any) string {
	arr, ok := raw.([]any)
	if !ok {
		return fmt.Sprint(raw)
	}
	opts := parseSelectOptions(f)
	idToLabel := map[string]string{}
	for _, it := range opts.Items {
		idToLabel[it.ID] = it.Label
	}
	var parts []string
	for _, v := range arr {
		id := fmt.Sprint(v)
		lbl := idToLabel[id]
		if lbl == "" {
			lbl = id
		}
		dot := lipgloss.NewStyle().Foreground(Gold).Render("●")
		parts = append(parts, dot+" "+lbl)
	}
	return strings.Join(parts, "  ")
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

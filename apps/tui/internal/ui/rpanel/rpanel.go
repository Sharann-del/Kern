package rpanel

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

var (
	colorGold    = lipgloss.Color("#C8A84B")
	colorPrimary = lipgloss.Color("#F5F4F0")
	colorSecond  = lipgloss.Color("#A8A89E")
	colorDim     = lipgloss.Color("#6B6B64")
	colorMuted   = lipgloss.Color("#4A4A46")
	colorBorder  = lipgloss.Color("#2A2A28")
)

// spark block characters ordered from shortest to tallest bar.
var sparkBlocks = []rune{'▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'}

// FieldInfo is a key/value pair displayed in the detail section.
type FieldInfo struct {
	Name  string
	Value string
}

// Item holds everything the right panel needs to render.
type Item struct {
	ID         string
	Name       string
	Kind       string // "workspace", "collection", "live source"
	SyncStatus string
	RowCount   int
	Fields     []FieldInfo
}

// Model is the right panel display model. It is passive — the layout owns
// mutation and calls SetItem / SetSize directly; no Update method is needed.
type Model struct {
	item          *Item
	width, height int
	isLive        bool // true when Supabase realtime is connected
}

// New creates a right panel model.
func New(width, height int) Model {
	return Model{width: width, height: height}
}

// SetItem replaces the displayed item. Pass nil to show the empty state.
func (m Model) SetItem(item Item) Model { m.item = &item; return m }

// SetLive marks whether the Supabase realtime subscription is active.
func (m Model) SetLive(v bool) Model { m.isLive = v; return m }

// SetSize updates panel dimensions.
func (m Model) SetSize(w, h int) Model { m.width = w; m.height = h; return m }

// ── View ──────────────────────────────────────────────────────────────────────

func (m Model) View() string {
	w := m.width
	h := m.height
	if w < 4 {
		w = 4
	}
	if h < 4 {
		h = 4
	}

	if m.item == nil {
		return lipgloss.NewStyle().
			Width(w).
			Height(h).
			Render("")
	}

	item := m.item
	inner := w - 2 // 1 char padding each side

	var lines []string

	// ── Name ──────────────────────────────────────────────
	lines = append(lines,
		lipgloss.NewStyle().
			Foreground(colorPrimary).
			Bold(true).
			PaddingLeft(1).
			Render(truncate(item.Name, inner)))
	lines = append(lines, "")

	div := divider(inner)

	// ── Custom fields (if any) ─────────────────────────────
	if len(item.Fields) > 0 {
		lines = append(lines, div)
		for _, f := range item.Fields {
			lines = append(lines, fieldRow(f.Name, f.Value, w))
		}
	}

	// ── Collection stats ──────────────────────────────────
	lines = append(lines, div)
	lines = append(lines, fieldRow("items", fmt.Sprintf("%d", item.RowCount), w))
	if item.Kind != "" {
		lines = append(lines, fieldRow("kind", item.Kind, w))
	}
	if item.SyncStatus != "" {
		lines = append(lines, fieldRow("sync", item.SyncStatus, w))
	}

	// ── Activity spark chart ───────────────────────────────
	// TODO: replace placeholder values with real time-series data from Supabase.
	lines = append(lines, div)
	lines = append(lines, "")
	lines = append(lines,
		" "+lipgloss.NewStyle().Foreground(colorDim).Render("activity"))
	spark := sparkBar(activityData(item.RowCount))
	lines = append(lines,
		" "+lipgloss.NewStyle().Foreground(colorGold).Render(spark))
	lines = append(lines, "")

	// ── Live indicator ────────────────────────────────────
	if m.isLive || item.SyncStatus == "synced" {
		lines = append(lines,
			" "+lipgloss.NewStyle().Foreground(colorGold).Render("● live"))
	}

	content := strings.Join(lines, "\n")

	return lipgloss.NewStyle().
		Width(w).
		Height(h).
		Render(content)
}

// ── helpers ───────────────────────────────────────────────────────────────────

func divider(w int) string {
	if w < 1 {
		w = 1
	}
	return " " + lipgloss.NewStyle().Foreground(colorBorder).Render(strings.Repeat("─", w))
}

// fieldRow renders "label    value" right-aligned within width w.
func fieldRow(label, value string, w int) string {
	label = " " + label // 1-char left pad
	labelW := len([]rune(label))
	valueW := len([]rune(value))

	gap := w - labelW - valueW - 1 // 1-char right pad
	if gap < 1 {
		gap = 1
	}

	return lipgloss.NewStyle().Foreground(colorDim).Render(label) +
		strings.Repeat(" ", gap) +
		lipgloss.NewStyle().Foreground(colorSecond).Render(value)
}

// sparkBar converts float64 values to Unicode block characters.
func sparkBar(values []float64) string {
	if len(values) == 0 {
		return strings.Repeat(string(sparkBlocks[0]), 8)
	}
	max := 0.0
	for _, v := range values {
		if v > max {
			max = v
		}
	}
	var sb strings.Builder
	for _, v := range values {
		idx := 0
		if max > 0 {
			idx = int((v / max) * float64(len(sparkBlocks)-1))
			if idx < 0 {
				idx = 0
			}
			if idx >= len(sparkBlocks) {
				idx = len(sparkBlocks) - 1
			}
		}
		sb.WriteRune(sparkBlocks[idx])
	}
	return sb.String()
}

// activityData returns 10 placeholder activity values derived from rowCount.
// Replace with real time-series data once the API supports it.
func activityData(rowCount int) []float64 {
	if rowCount == 0 {
		return []float64{0, 0, 0, 0, 0, 0, 0, 0, 0, 0}
	}
	c := float64(rowCount)
	return []float64{
		c * 0.2, c * 0.4, c * 0.3, c * 0.6, c * 0.5,
		c * 0.8, c * 0.7, c * 1.0, c * 0.6, c * 0.9,
	}
}

func truncate(s string, max int) string {
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	if max <= 1 {
		return string(runes[:max])
	}
	return string(runes[:max-1]) + "…"
}

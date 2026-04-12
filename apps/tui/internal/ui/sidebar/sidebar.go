package sidebar

import (
	"strconv"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/Sharann-del/kern/tui/internal/api"
)

var (
	colorGold    = lipgloss.Color("#C8A84B")
	colorSection = lipgloss.Color("#3d3a37")
	colorBorder  = lipgloss.Color("#1e1c1a")
	colorDimDot  = lipgloss.Color("#3a3835")
	colorText    = lipgloss.Color("#A8A89E")
	colorMuted   = lipgloss.Color("#4A4A46")
)

// ItemKind identifies the type of a sidebar nav item.
type ItemKind uint8

const (
	KindWorkspace  ItemKind = iota
	KindCollection          // regular (non-live) collection
	KindLiveSource          // collection with is_live_source == true
)

// navItem is a single navigable entry in the sidebar list.
type navItem struct {
	id         string
	name       string
	count      int // row count; 0 means no count rendered
	kind       ItemKind
	syncStatus string
}

// SelectMsg is emitted whenever the active item changes.
// The layout model listens for this to update the title bar and right panel.
type SelectMsg struct {
	ID         string
	Kind       ItemKind
	Name       string
	SyncStatus string
	RowCount   int
}

// ── internal load messages ────────────────────────────────────────────────────

type workspacesLoadedMsg struct {
	items []api.Workspace
	err   error
}

type collectionsLoadedMsg struct {
	items []api.Collection
	err   error
}

// ── Model ─────────────────────────────────────────────────────────────────────

// Model is the sidebar Bubble Tea sub-model.
type Model struct {
	client      *api.Client
	workspaces  []api.Workspace
	collections []api.Collection

	items  []navItem // flat nav list (workspaces → collections → live sources)
	cursor int

	width, height int
	focused       bool
	loading       bool
}

// New creates a sidebar model. width is the total allocated width (including the
// right border), height is the usable body height.
func New(client *api.Client, width, height int) Model {
	return Model{
		client:  client,
		width:   width,
		height:  height,
		loading: true,
	}
}

// SetFocused toggles keyboard capture. Used by the layout's focus manager.
func (m Model) SetFocused(v bool) Model { m.focused = v; return m }

// SetSize updates panel dimensions; call on tea.WindowSizeMsg from the layout.
func (m Model) SetSize(w, h int) Model { m.width = w; m.height = h; return m }

// Init implements the sub-model Init convention: fire the load commands.
func (m Model) Init() tea.Cmd {
	return tea.Batch(
		func() tea.Msg {
			items, err := m.client.ListWorkspaces()
			return workspacesLoadedMsg{items: items, err: err}
		},
		func() tea.Msg {
			items, err := m.client.ListCollections()
			return collectionsLoadedMsg{items: items, err: err}
		},
	)
}

// Update handles messages routed from the layout's Update.
func (m Model) Update(msg tea.Msg) (Model, tea.Cmd) {
	switch msg := msg.(type) {
	case workspacesLoadedMsg:
		if msg.err == nil {
			m.workspaces = msg.items
		}
		m.items = m.buildItems()
		if len(m.collections) > 0 {
			m.loading = false
		}
		return m, m.emitSelection()

	case collectionsLoadedMsg:
		if msg.err == nil {
			m.collections = msg.items
		}
		m.items = m.buildItems()
		m.loading = false
		return m, m.emitSelection()

	case tea.KeyMsg:
		if !m.focused {
			return m, nil
		}
		switch msg.String() {
		case "j", "down":
			if m.cursor < len(m.items)-1 {
				m.cursor++
				return m, m.emitSelection()
			}
		case "k", "up":
			if m.cursor > 0 {
				m.cursor--
				return m, m.emitSelection()
			}
		}
	}
	return m, nil
}

// emitSelection returns a Cmd that dispatches a SelectMsg for the current item.
func (m Model) emitSelection() tea.Cmd {
	if len(m.items) == 0 || m.cursor >= len(m.items) {
		return nil
	}
	item := m.items[m.cursor]
	msg := SelectMsg{
		ID:         item.id,
		Kind:       item.kind,
		Name:       item.name,
		RowCount:   item.count,
		SyncStatus: item.syncStatus,
	}
	return func() tea.Msg { return msg }
}

// buildItems reconstructs the flat nav list from loaded workspaces/collections.
func (m Model) buildItems() []navItem {
	var out []navItem
	for _, w := range m.workspaces {
		out = append(out, navItem{id: w.ID, name: w.Name, kind: KindWorkspace})
	}
	for _, c := range m.collections {
		if !c.IsLiveSource {
			out = append(out, navItem{
				id:         c.ID,
				name:       c.Name,
				count:      c.RowCount(),
				kind:       KindCollection,
				syncStatus: c.SyncStatus,
			})
		}
	}
	for _, c := range m.collections {
		if c.IsLiveSource {
			out = append(out, navItem{
				id:         c.ID,
				name:       c.Name,
				count:      c.RowCount(),
				kind:       KindLiveSource,
				syncStatus: c.SyncStatus,
			})
		}
	}
	return out
}

// ── View ──────────────────────────────────────────────────────────────────────

// View renders the sidebar. Total width == m.width (content + 1 right border).
func (m Model) View() string {
	// innerW is the usable text area; the right border occupies 1 char.
	innerW := m.width - 1
	if innerW < 4 {
		innerW = 4
	}
	h := m.height
	if h < 4 {
		h = 4
	}

	var lines []string

	// ── KERN logo ─────────────────────────────────────────
	logoStyle := lipgloss.NewStyle().Foreground(colorGold).Bold(true)
	lines = append(lines, " "+logoStyle.Render("KERN"))
	lines = append(lines, "")

	// ── Sections ──────────────────────────────────────────
	type sectionDef struct {
		header string
		kind   ItemKind
	}
	defs := []sectionDef{
		{"WORKSPACES", KindWorkspace},
		{"COLLECTIONS", KindCollection},
		{"LIVE SOURCES", KindLiveSource},
	}

	// Group items by kind while preserving global index for cursor tracking.
	type idxItem struct {
		globalIdx int
		item      navItem
	}
	byKind := map[ItemKind][]idxItem{}
	for i, it := range m.items {
		byKind[it.kind] = append(byKind[it.kind], idxItem{i, it})
	}

	for _, sec := range defs {
		lines = append(lines, m.sectionHeader(sec.header, innerW))
		kids := byKind[sec.kind]
		switch {
		case len(kids) == 0 && m.loading:
			lines = append(lines,
				lipgloss.NewStyle().Foreground(colorMuted).PaddingLeft(2).Render("…"))
		case len(kids) == 0:
			// no items — skip blank rows, just the header is enough
		default:
			for _, ii := range kids {
				lines = append(lines, m.navItem(ii.globalIdx, ii.item, innerW))
			}
		}
		lines = append(lines, "")
	}

	content := strings.Join(lines, "\n")

	return lipgloss.NewStyle().
		Width(innerW).
		Height(h).
		Border(lipgloss.Border{Right: "│"}, false, true, false, false).
		BorderForeground(colorBorder).
		Render(content)
}

func (m Model) sectionHeader(label string, w int) string {
	return lipgloss.NewStyle().
		Foreground(colorSection).
		Bold(true).
		PaddingLeft(1).
		Render(truncate(label, w-1))
}

func (m Model) navItem(globalIdx int, item navItem, w int) string {
	isActive := globalIdx == m.cursor

	var indicator string
	var textColor, countColor lipgloss.Color
	if isActive {
		indicator = lipgloss.NewStyle().Foreground(colorGold).Render("▌")
		textColor = colorGold
		countColor = colorGold
	} else {
		indicator = lipgloss.NewStyle().Foreground(colorDimDot).Render("·")
		textColor = colorText
		countColor = colorMuted
	}

	countStr := ""
	if item.count > 0 {
		countStr = strconv.Itoa(item.count)
	}

	// Layout: indicator(1) + space(1) + name(nameW) + space(1) + count(countW)
	// Total visual width = w
	nameW := w - 2
	if countStr != "" {
		nameW -= len(countStr) + 1
	}
	if nameW < 1 {
		nameW = 1
	}

	name := truncate(item.name, nameW)
	nameRunes := len([]rune(name))
	pad := nameW - nameRunes
	if pad < 0 {
		pad = 0
	}

	row := indicator + " " +
		lipgloss.NewStyle().Foreground(textColor).Render(name) +
		strings.Repeat(" ", pad)
	if countStr != "" {
		row += " " + lipgloss.NewStyle().Foreground(countColor).Render(countStr)
	}
	return row
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

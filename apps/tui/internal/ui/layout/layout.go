package layout

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/Sharann-del/kern/tui/internal/api"
	"github.com/Sharann-del/kern/tui/internal/ui/rpanel"
	"github.com/Sharann-del/kern/tui/internal/ui/sidebar"
	"github.com/Sharann-del/kern/tui/internal/ui/statusbar"
)

// Layout geometry constants.
const (
	sidebarWidth = 20 // total chars, including right border
	rpanelWidth  = 24 // total chars
	titlebarH    = 1
	statusbarH   = 1
	rowsPageSize = 50
)

// Focus identifies which panel owns keyboard input.
type Focus int

const (
	FocusSidebar Focus = iota
	FocusMain
)

// ── internal load messages ────────────────────────────────────────────────────

type rowsLoadedMsg struct {
	collID string
	items  []api.Row
	err    error
}

type fieldsLoadedMsg struct {
	collID string
	items  []api.Field
	err    error
}

// ── Model ─────────────────────────────────────────────────────────────────────

// Model is the root layout Bubble Tea model.
type Model struct {
	sidebar sidebar.Model
	rpanel  rpanel.Model

	focus Focus

	// Title bar state
	workspace  string
	collection string

	// Last selection — drives data loading and status bar
	lastSel        *sidebar.SelectMsg
	selectedCollID string

	// Main content
	rows        []api.Row
	fields      []api.Field
	rowCursor   int
	rowsLoading bool

	// Realtime connection state
	isLive bool

	width, height int
	client        *api.Client
}

// New constructs the layout. client must be authenticated.
func New(client *api.Client, width, height int) Model {
	bodyH := bodyHeight(height)
	sb := sidebar.New(client, sidebarWidth, bodyH)
	sb = sb.SetFocused(true)
	rp := rpanel.New(rpanelWidth, bodyH)
	return Model{
		client:  client,
		sidebar: sb,
		rpanel:  rp,
		width:   width,
		height:  height,
		focus:   FocusSidebar,
	}
}

// ── tea.Model ─────────────────────────────────────────────────────────────────

func (m Model) Init() tea.Cmd {
	return m.sidebar.Init()
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd

	// Route every message through the sidebar so its load messages arrive.
	var sbCmd tea.Cmd
	m.sidebar, sbCmd = m.sidebar.Update(msg)
	cmds = append(cmds, sbCmd)

	switch msg := msg.(type) {

	// ── sidebar selection ─────────────────────────────────
	case sidebar.SelectMsg:
		m.lastSel = &msg
		switch msg.Kind {
		case sidebar.KindWorkspace:
			m.workspace = msg.Name
		case sidebar.KindCollection, sidebar.KindLiveSource:
			m.collection = msg.Name
		}

		// Update right panel.
		ri := rpanel.Item{
			ID:         msg.ID,
			Name:       msg.Name,
			Kind:       kindLabel(msg.Kind),
			SyncStatus: msg.SyncStatus,
			RowCount:   msg.RowCount,
		}
		m.rpanel = m.rpanel.SetItem(ri)

		// Load content for collections / live sources.
		if (msg.Kind == sidebar.KindCollection || msg.Kind == sidebar.KindLiveSource) &&
			msg.ID != m.selectedCollID {
			m.selectedCollID = msg.ID
			m.rows = nil
			m.fields = nil
			m.rowCursor = 0
			m.rowsLoading = true
			cmds = append(cmds,
				loadRowsCmd(m.client, msg.ID),
				loadFieldsCmd(m.client, msg.ID),
			)
		}

	// ── data load results ─────────────────────────────────
	case rowsLoadedMsg:
		if msg.collID == m.selectedCollID {
			m.rowsLoading = false
			if msg.err == nil {
				m.rows = msg.items
			}
			if m.rowCursor >= len(m.rows) {
				m.rowCursor = 0
			}
		}

	case fieldsLoadedMsg:
		if msg.collID == m.selectedCollID && msg.err == nil {
			m.fields = msg.items
		}

	// ── terminal resize ───────────────────────────────────
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		bodyH := bodyHeight(m.height)
		m.sidebar = m.sidebar.SetSize(sidebarWidth, bodyH)
		m.rpanel = m.rpanel.SetSize(rpanelWidth, bodyH)

	// ── keyboard ──────────────────────────────────────────
	case tea.KeyMsg:
		switch msg.String() {
		case "tab":
			if m.focus == FocusSidebar {
				m.focus = FocusMain
				m.sidebar = m.sidebar.SetFocused(false)
			} else {
				m.focus = FocusSidebar
				m.sidebar = m.sidebar.SetFocused(true)
			}
		case "j", "down":
			if m.focus == FocusMain && m.rowCursor < len(m.rows)-1 {
				m.rowCursor++
			}
		case "k", "up":
			if m.focus == FocusMain && m.rowCursor > 0 {
				m.rowCursor--
			}
		case "esc":
			if m.focus == FocusMain {
				m.focus = FocusSidebar
				m.sidebar = m.sidebar.SetFocused(true)
			}
		}
	}

	return m, tea.Batch(cmds...)
}

// ── commands ──────────────────────────────────────────────────────────────────

func loadRowsCmd(c *api.Client, collID string) tea.Cmd {
	return func() tea.Msg {
		items, err := c.ListRows(collID, rowsPageSize, 0)
		return rowsLoadedMsg{collID: collID, items: items, err: err}
	}
}

func loadFieldsCmd(c *api.Client, collID string) tea.Cmd {
	return func() tea.Msg {
		items, err := c.ListFields(collID)
		return fieldsLoadedMsg{collID: collID, items: items, err: err}
	}
}

// ── View ──────────────────────────────────────────────────────────────────────

func (m Model) View() string {
	w := m.width
	h := m.height
	if w <= 0 {
		w = 80
	}
	if h <= 0 {
		h = 24
	}

	bodyH := bodyHeight(h)
	mainW := mainWidth(w)

	title := m.renderTitleBar(w)

	sideView := m.sidebar.View()
	mainView := m.renderMain(mainW, bodyH)
	rpView := m.rpanel.View()
	body := lipgloss.JoinHorizontal(lipgloss.Top, sideView, mainView, rpView)

	wsName := m.workspace
	repoCount := 0
	synced := false
	if m.lastSel != nil {
		repoCount = m.lastSel.RowCount
		synced = m.lastSel.SyncStatus == "synced"
	}
	status := statusbar.Render(w, wsName, repoCount, synced)

	return lipgloss.JoinVertical(lipgloss.Left, title, body, status)
}

// ── sub-renderers ─────────────────────────────────────────────────────────────

func (m Model) renderTitleBar(w int) string {
	textStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#3d3a37"))
	ws := m.workspace
	if ws == "" {
		ws = "—"
	}
	col := m.collection
	if col == "" {
		col = "—"
	}
	center := textStyle.Render("kern — " + ws + " / " + col)
	centerW := lipgloss.Width(center)

	leftPad := (w - centerW) / 2
	if leftPad < 0 {
		leftPad = 0
	}

	line := strings.Repeat(" ", leftPad) + center
	lineW := lipgloss.Width(line)
	if lineW < w {
		line += strings.Repeat(" ", w-lineW)
	}
	return line
}

func (m Model) renderMain(w, h int) string {
	inner := w - 2 // 1-char padding each side

	// ── empty / loading states ────────────────────────────
	if m.selectedCollID == "" {
		hint := lipgloss.NewStyle().Foreground(lipgloss.Color("#3d3a37")).
			Render("select a collection")
		return lipgloss.NewStyle().Width(w).Height(h).
			Align(lipgloss.Center, lipgloss.Center).
			Render(hint)
	}

	if m.rowsLoading {
		spin := lipgloss.NewStyle().Foreground(lipgloss.Color("#4A4A46")).Render("loading…")
		return lipgloss.NewStyle().Width(w).Height(h).
			Align(lipgloss.Center, lipgloss.Center).
			Render(spin)
	}

	if len(m.rows) == 0 {
		empty := lipgloss.NewStyle().Foreground(lipgloss.Color("#3d3a37")).Render("no rows")
		return lipgloss.NewStyle().Width(w).Height(h).
			Align(lipgloss.Center, lipgloss.Center).
			Render(empty)
	}

	// ── collection header ─────────────────────────────────
	var lines []string

	collStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#C8A84B")).Bold(true).PaddingLeft(1)
	countStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#4A4A46"))
	header := collStyle.Render(m.collection) +
		" " + countStyle.Render(fmt.Sprintf("%d rows", len(m.rows)))
	lines = append(lines, header)
	lines = append(lines,
		lipgloss.NewStyle().Foreground(lipgloss.Color("#2A2A28")).
			Render(strings.Repeat("─", inner)))
	lines = append(lines, "")

	// ── row list ──────────────────────────────────────────
	primarySlug := m.primarySlug()
	visibleRows := h - 4 // account for header lines above + padding
	if visibleRows < 1 {
		visibleRows = 1
	}

	// Scroll window: keep cursor visible.
	start := 0
	if m.rowCursor >= visibleRows {
		start = m.rowCursor - visibleRows + 1
	}
	end := start + visibleRows
	if end > len(m.rows) {
		end = len(m.rows)
	}

	for i := start; i < end; i++ {
		row := m.rows[i]
		isActive := i == m.rowCursor && m.focus == FocusMain

		title := rowTitle(row, primarySlug)
		title = truncate(title, inner-3)

		var line string
		if isActive {
			indicator := lipgloss.NewStyle().Foreground(lipgloss.Color("#C8A84B")).Render("▸")
			text := lipgloss.NewStyle().Foreground(lipgloss.Color("#C8A84B")).Render(title)
			line = " " + indicator + " " + text
		} else {
			text := lipgloss.NewStyle().Foreground(lipgloss.Color("#A8A89E")).Render(title)
			line = "   " + text
		}
		lines = append(lines, line)
	}

	content := strings.Join(lines, "\n")
	return lipgloss.NewStyle().Width(w).Height(h).Render(content)
}

// ── helpers ───────────────────────────────────────────────────────────────────

func (m Model) primarySlug() string {
	for _, f := range m.fields {
		if f.IsPrimary {
			return f.Slug
		}
	}
	// Fall back to first text field.
	for _, f := range m.fields {
		if f.Type == "text" || f.Type == "rich_text" {
			return f.Slug
		}
	}
	return ""
}

func rowTitle(row api.Row, primarySlug string) string {
	if primarySlug != "" {
		if v, ok := row.Data[primarySlug]; ok {
			if s, ok := v.(string); ok && s != "" {
				return s
			}
		}
	}
	// Fall back to any non-empty string field in Data.
	for _, v := range row.Data {
		if s, ok := v.(string); ok && s != "" {
			return s
		}
	}
	// Last resort: short row ID.
	if len(row.ID) >= 8 {
		return row.ID[:8]
	}
	return row.ID
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

// ── geometry helpers ──────────────────────────────────────────────────────────

func bodyHeight(termH int) int {
	h := termH - titlebarH - statusbarH
	if h < 4 {
		h = 4
	}
	return h
}

func mainWidth(termW int) int {
	w := termW - sidebarWidth - rpanelWidth
	if w < 20 {
		w = 20
	}
	return w
}

func kindLabel(k sidebar.ItemKind) string {
	switch k {
	case sidebar.KindWorkspace:
		return "workspace"
	case sidebar.KindCollection:
		return "collection"
	case sidebar.KindLiveSource:
		return "live source"
	}
	return ""
}

package ui

import (
	"strings"

	"github.com/charmbracelet/bubbles/spinner"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/Sharann-del/kern/tui/internal/api"
	"github.com/Sharann-del/kern/tui/internal/config"
)

const rowsPageSize = 50

// DashboardModel is the main three-panel UI.
type DashboardModel struct {
	client *api.Client
	cfg    *config.Config
	userID string

	collections    []api.Collection
	selectedColIdx int

	fields []api.Field
	rows   []api.Row

	rowsOffset   int
	rowsHasMore  bool
	rowsLoading  bool
	selectedRowIdx int

	focusedPanel  int
	previewScroll int

	mode          string
	searchMode    bool
	searchInput   textinput.Model

	confirmLabel string
	pendingKind  string
	pendingID    string

	showFieldsView   bool
	selectedFieldIdx int

	form *FormModel

	width, height int
	err           error
	loading       bool

	// Account menu (matches web UserMenu: Settings, Shortcuts, Sign out)
	accountMenuOpen bool
	accountMenuIdx  int
	// pageOverlay is "", "settings", or "shortcuts" (full-screen info)
	pageOverlay string

	spinner spinner.Model
}

 func newDashboard(client *api.Client, cfg *config.Config, userID string, w, h int) *DashboardModel {
	s := spinner.New()
	s.Spinner = spinner.Dot
	s.Style = lipgloss.NewStyle().Foreground(Gold)
	si := textinput.New()
	si.Placeholder = "filter"
	si.CharLimit = 128
	si.Width = min(40, w/3)
	return &DashboardModel{
		client:         client,
		cfg:            cfg,
		userID:         userID,
		width:          w,
		height:         h,
		focusedPanel:   0,
		selectedColIdx: 0,
		selectedRowIdx: 0,
		mode:           "normal",
		searchInput:    si,
		spinner:        s,
		loading:        true,
	}
}

func (d *DashboardModel) overlayActive() bool {
	return d.form != nil || d.mode == "confirm-delete" || d.mode == "confirm-signout" ||
		d.accountMenuOpen || d.pageOverlay != ""
}

func (d *DashboardModel) capturesKeyboard() bool {
	if d.form != nil || d.searchMode || d.accountMenuOpen || d.pageOverlay != "" {
		return true
	}
	return false
}

func (d *DashboardModel) selectedCollectionID() string {
	if d.selectedColIdx < 0 || d.selectedColIdx >= len(d.collections) {
		return ""
	}
	return d.collections[d.selectedColIdx].ID
}

func (d *DashboardModel) visibleRows() []api.Row {
	if d.searchMode {
		q := strings.TrimSpace(d.searchInput.Value())
		return api.SearchRows(d.rows, q)
	}
	return d.rows
}

// Init implements tea.Model.
func (d *DashboardModel) Init() tea.Cmd {
	return tea.Batch(
		d.spinner.Tick,
		loadCollectionsCmd(d.client),
	)
}

func refreshSessionCmd(baseURL, anonKey, refreshToken string) tea.Cmd {
	return func() tea.Msg {
		res, err := api.RefreshSession(baseURL, anonKey, refreshToken)
		return sessionRefreshedMsg{res: res, err: err}
	}
}

func loadCollectionsCmd(c *api.Client) tea.Cmd {
	return func() tea.Msg {
		items, err := c.ListCollections()
		return collectionsLoadedMsg{items: items, err: err}
	}
}

func loadFieldsCmd(c *api.Client, collectionID string) tea.Cmd {
	return func() tea.Msg {
		items, err := c.ListFields(collectionID)
		return fieldsLoadedMsg{items: items, err: err}
	}
}

func loadRowsCmd(c *api.Client, collectionID string, offset int, append bool) tea.Cmd {
	return func() tea.Msg {
		items, err := c.ListRows(collectionID, rowsPageSize, offset)
		return rowsLoadedMsg{items: items, append: append, err: err}
	}
}

func deleteRowCmd(c *api.Client, id string) tea.Cmd {
	return func() tea.Msg {
		return mutationDoneMsg{err: c.DeleteRow(id)}
	}
}

func deleteCollectionCmd(c *api.Client, id string) tea.Cmd {
	return func() tea.Msg {
		return mutationDoneMsg{err: c.DeleteCollection(id)}
	}
}

func deleteFieldCmd(c *api.Client, id string) tea.Cmd {
	return func() tea.Msg {
		return mutationDoneMsg{err: c.DeleteField(id)}
	}
}

func createRowCmd(c *api.Client, userID, collID string, data map[string]any) tea.Cmd {
	return func() tea.Msg {
		_, err := c.CreateRow(userID, collID, data)
		return mutationDoneMsg{err: err}
	}
}

func updateRowCmd(c *api.Client, rowID string, data map[string]any) tea.Cmd {
	return func() tea.Msg {
		return mutationDoneMsg{err: c.UpdateRow(rowID, data)}
	}
}

func createCollectionCmd(c *api.Client, userID, name, slug, icon, color string) tea.Cmd {
	return func() tea.Msg {
		_, err := c.CreateCollection(userID, name, slug, icon, color)
		return mutationDoneMsg{err: err}
	}
}

func renameCollectionCmd(c *api.Client, id, name string) tea.Cmd {
	return func() tea.Msg {
		return mutationDoneMsg{err: c.UpdateCollection(id, map[string]any{"name": name})}
	}
}

func createFieldCmd(c *api.Client, userID, collID, name, typ string, slugs map[string]struct{}) tea.Cmd {
	return func() tea.Msg {
		_, err := c.CreateField(userID, collID, name, typ, slugs)
		return mutationDoneMsg{err: err}
	}
}

func (d *DashboardModel) reloadAfterMutation() tea.Cmd {
	d.err = nil
	return tea.Batch(
		loadCollectionsCmd(d.client),
		d.reloadCurrentCollectionCmd(),
	)
}

func (d *DashboardModel) reloadCurrentCollectionCmd() tea.Cmd {
	cid := d.selectedCollectionID()
	if cid == "" {
		return nil
	}
	return tea.Batch(
		loadFieldsCmd(d.client, cid),
		loadRowsCmd(d.client, cid, 0, false),
	)
}

// Update implements tea.Model.
func (d *DashboardModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case spinner.TickMsg:
		var cmd tea.Cmd
		d.spinner, cmd = d.spinner.Update(msg)
		return d, cmd

	case collectionsLoadedMsg:
		d.loading = false
		if msg.err != nil {
			if strings.Contains(msg.err.Error(), "401") && d.cfg.RefreshToken != "" {
				return d, refreshSessionCmd(d.cfg.SupabaseURL, d.cfg.SupabaseKey, d.cfg.RefreshToken)
			}
			d.err = msg.err
			return d, nil
		}
		d.collections = msg.items
		if d.selectedColIdx >= len(d.collections) {
			d.selectedColIdx = max(0, len(d.collections)-1)
		}
		if cid := d.selectedCollectionID(); cid != "" {
			d.rowsLoading = true
			return d, tea.Batch(
				loadFieldsCmd(d.client, cid),
				loadRowsCmd(d.client, cid, 0, false),
			)
		}
		d.fields = nil
		d.rows = nil
		d.rowsHasMore = false
		return d, nil

	case fieldsLoadedMsg:
		if msg.err != nil {
			if strings.Contains(msg.err.Error(), "401") && d.cfg.RefreshToken != "" {
				return d, refreshSessionCmd(d.cfg.SupabaseURL, d.cfg.SupabaseKey, d.cfg.RefreshToken)
			}
			d.err = msg.err
			return d, nil
		}
		d.fields = msg.items
		return d, nil

	case rowsLoadedMsg:
		d.rowsLoading = false
		if msg.err != nil {
			if strings.Contains(msg.err.Error(), "401") && d.cfg.RefreshToken != "" {
				return d, refreshSessionCmd(d.cfg.SupabaseURL, d.cfg.SupabaseKey, d.cfg.RefreshToken)
			}
			d.err = msg.err
			return d, nil
		}
		if msg.append {
			d.rows = append(d.rows, msg.items...)
		} else {
			d.rows = msg.items
			d.selectedRowIdx = 0
			d.previewScroll = 0
		}
		d.rowsHasMore = len(msg.items) == rowsPageSize
		return d, nil

	case mutationDoneMsg:
		if msg.err != nil {
			d.err = msg.err
			d.mode = "normal"
			d.form = nil
			return d, nil
		}
		d.mode = "normal"
		d.form = nil
		d.pendingID = ""
		d.confirmLabel = ""
		return d, d.reloadAfterMutation()

	case sessionRefreshedMsg:
		if msg.err != nil {
			if strings.Contains(msg.err.Error(), "400") {
				return d, signOutCmd(d.cfg)
			}
			d.err = msg.err
			return d, nil
		}
		d.cfg.AccessToken = msg.res.AccessToken
		d.cfg.RefreshToken = msg.res.RefreshToken
		d.client.SetAuthToken(msg.res.AccessToken)
		_ = config.Save(d.cfg)
		return d, loadCollectionsCmd(d.client)

	case tea.WindowSizeMsg:
		d.width = msg.Width
		d.height = msg.Height
		return d, nil

	case tea.KeyMsg:
		if d.pageOverlay != "" {
			if msg.String() == "esc" {
				d.pageOverlay = ""
				return d, nil
			}
			return d, nil
		}
		if d.accountMenuOpen {
			switch msg.String() {
			case "esc":
				d.accountMenuOpen = false
				return d, nil
			case "j", "down":
				if d.accountMenuIdx < len(accountMenuLabels())-1 {
					d.accountMenuIdx++
				}
				return d, nil
			case "k", "up":
				if d.accountMenuIdx > 0 {
					d.accountMenuIdx--
				}
				return d, nil
			case "enter":
				switch d.accountMenuIdx {
				case accountMenuSettings:
					d.accountMenuOpen = false
					d.pageOverlay = "settings"
				case accountMenuShortcuts:
					d.accountMenuOpen = false
					d.pageOverlay = "shortcuts"
				case accountMenuSignOut:
					d.accountMenuOpen = false
					d.mode = "confirm-signout"
				}
				return d, nil
			}
			return d, nil
		}
		if d.form != nil {
			done, saved, fcmd := d.form.Update(msg)
			if !done {
				return d, fcmd
			}
			if !saved {
				d.form = nil
				return d, nil
			}
			return d.submitForm()
		}
		if d.mode == "confirm-signout" {
			switch msg.String() {
			case "y", "Y":
				d.mode = "normal"
				return d, signOutCmd(d.cfg)
			case "n", "N", "esc", "enter":
				d.mode = "normal"
				return d, nil
			}
			return d, nil
		}
		if d.mode == "confirm-delete" {
			switch msg.String() {
			case "y", "Y":
				return d.execDelete()
			case "n", "N", "esc", "enter":
				d.mode = "normal"
				d.pendingID = ""
				return d, nil
			}
			return d, nil
		}
		if d.searchMode {
			switch msg.String() {
			case "esc":
				d.searchMode = false
				d.searchInput.Blur()
				d.selectedRowIdx = min(d.selectedRowIdx, max(0, len(d.visibleRows())-1))
				return d, nil
			}
			var cmd tea.Cmd
			d.searchInput, cmd = d.searchInput.Update(msg)
			rows := d.visibleRows()
			if d.selectedRowIdx >= len(rows) {
				d.selectedRowIdx = max(0, len(rows)-1)
			}
			return d, cmd
		}

		switch msg.String() {
		case "?":
			d.pageOverlay = "shortcuts"
			return d, nil
		case "o":
			d.accountMenuOpen = !d.accountMenuOpen
			if d.accountMenuOpen {
				d.accountMenuIdx = 0
			}
			return d, nil
		case "tab":
			if d.showFieldsView {
				return d, nil
			}
			d.focusedPanel = (d.focusedPanel + 1) % 3
			return d, nil
		case "r":
			if d.err != nil {
				d.err = nil
				return d, d.reloadAfterMutation()
			}
		}

		if d.showFieldsView && d.focusedPanel == 1 {
			return d.updateFieldsViewKeys(msg)
		}

		switch d.focusedPanel {
		case 0:
			return d.updateCollectionsKeys(msg)
		case 1:
			return d.updateRowsKeys(msg)
		case 2:
			return d.updatePreviewKeys(msg)
		}
		return d, nil
	}

	return d, nil
}

func (d *DashboardModel) submitForm() (tea.Model, tea.Cmd) {
	switch d.form.kind {
	case FormNewRow, FormEditRow:
		data, err := d.form.BuildRowData()
		if err != nil {
			d.form.errText = err.Error()
			return d, nil
		}
		cid := d.form.collectionID
		if d.form.kind == FormEditRow {
			return d, updateRowCmd(d.client, d.form.rowID, data)
		}
		return d, createRowCmd(d.client, d.userID, cid, data)

	case FormNewCollection:
		name := strings.TrimSpace(d.form.inputs[0].Value())
		slug := strings.TrimSpace(d.form.inputs[1].Value())
		icon := strings.TrimSpace(d.form.inputs[2].Value())
		if name == "" {
			d.form.errText = "Name required"
			return d, nil
		}
		if slug == "" {
			slug = api.Slugify(name)
		}
		color := ""
		return d, createCollectionCmd(d.client, d.userID, name, slug, icon, color)

	case FormRenameCollection:
		name := strings.TrimSpace(d.form.inputs[0].Value())
		if name == "" {
			d.form.errText = "Name required"
			return d, nil
		}
		id := d.selectedCollectionID()
		return d, renameCollectionCmd(d.client, id, name)

	case FormNewField:
		name := strings.TrimSpace(d.form.inputs[0].Value())
		if name == "" {
			d.form.errText = "Name required"
			return d, nil
		}
		typ := d.form.fieldTypes[d.form.typeCursor]
		slugs := map[string]struct{}{}
		for _, f := range d.fields {
			slugs[f.Slug] = struct{}{}
		}
		cid := d.selectedCollectionID()
		return d, createFieldCmd(d.client, d.userID, cid, name, typ, slugs)
	}
	return d, nil
}

func (d *DashboardModel) execDelete() (tea.Model, tea.Cmd) {
	id := d.pendingID
	k := d.pendingKind
	d.mode = "normal"
	d.pendingID = ""
	d.confirmLabel = ""
	switch k {
	case "row":
		return d, deleteRowCmd(d.client, id)
	case "collection":
		return d, deleteCollectionCmd(d.client, id)
	case "field":
		return d, deleteFieldCmd(d.client, id)
	}
	return d, nil
}

func (d *DashboardModel) updateCollectionsKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "j", "down":
		if d.selectedColIdx < len(d.collections)-1 {
			d.selectedColIdx++
			d.rowsLoading = true
			cid := d.selectedCollectionID()
			return d, tea.Batch(
				loadFieldsCmd(d.client, cid),
				loadRowsCmd(d.client, cid, 0, false),
			)
		}
	case "k", "up":
		if d.selectedColIdx > 0 {
			d.selectedColIdx--
			d.rowsLoading = true
			cid := d.selectedCollectionID()
			return d, tea.Batch(
				loadFieldsCmd(d.client, cid),
				loadRowsCmd(d.client, cid, 0, false),
			)
		}
	case "n":
		d.form = NewCollectionForm(d.width, d.height)
		return d, d.form.Init()
	case "d":
		if len(d.collections) == 0 {
			return d, nil
		}
		c := d.collections[d.selectedColIdx]
		d.mode = "confirm-delete"
		d.pendingKind = "collection"
		d.pendingID = c.ID
		d.confirmLabel = c.Name
	case "r":
		if len(d.collections) == 0 {
			return d, nil
		}
		c := d.collections[d.selectedColIdx]
		d.form = RenameCollectionForm(c.Name, d.width, d.height)
		return d, d.form.Init()
	case "enter":
		d.focusedPanel = 1
		d.previewScroll = 0
	}
	return d, nil
}

func (d *DashboardModel) updateRowsKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	rows := d.visibleRows()
	switch msg.String() {
	case "j", "down":
		if len(rows) == 0 {
			return d, nil
		}
		if d.selectedRowIdx < len(rows)-1 {
			d.selectedRowIdx++
		} else if d.rowsHasMore && !d.rowsLoading {
			d.rowsLoading = true
			return d, loadRowsCmd(d.client, d.selectedCollectionID(), len(d.rows), true)
		}
	case "k", "up":
		if d.selectedRowIdx > 0 {
			d.selectedRowIdx--
		}
	case "n":
		if d.selectedCollectionID() == "" {
			return d, nil
		}
		d.form = NewRowForm(d.selectedCollectionID(), d.fields, nil, d.width, d.height)
		return d, d.form.Init()
	case "d":
		if len(rows) == 0 || d.selectedRowIdx < 0 || d.selectedRowIdx >= len(rows) {
			return d, nil
		}
		r := rows[d.selectedRowIdx]
		title := cellString(r.Data, primarySlug(d.fields))
		if title == "" {
			title = r.ID[:8]
		}
		d.mode = "confirm-delete"
		d.pendingKind = "row"
		d.pendingID = r.ID
		d.confirmLabel = title
	case "e":
		if len(rows) == 0 || d.selectedRowIdx < 0 || d.selectedRowIdx >= len(rows) {
			return d, nil
		}
		r := rows[d.selectedRowIdx]
		d.form = NewRowForm(d.selectedCollectionID(), d.fields, &r, d.width, d.height)
		return d, d.form.Init()
	case "/":
		d.searchMode = true
		d.searchInput.Focus()
		return d, textinput.Blink
	case "f":
		d.showFieldsView = true
		d.selectedFieldIdx = 0
		d.focusedPanel = 1
		return d, nil
	case "enter":
		d.focusedPanel = 2
	case "esc":
		d.focusedPanel = 0
	}
	return d, nil
}

func primarySlug(fields []api.Field) string {
	for _, f := range fields {
		if f.IsPrimary {
			return f.Slug
		}
	}
	return ""
}

func (d *DashboardModel) updatePreviewKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "j", "down":
		d.previewScroll++
	case "k", "up":
		if d.previewScroll > 0 {
			d.previewScroll--
		}
	}
	return d, nil
}

func (d *DashboardModel) updateFieldsViewKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		d.showFieldsView = false
		return d, nil
	case "j", "down":
		if d.selectedFieldIdx < len(d.fields)-1 {
			d.selectedFieldIdx++
		}
	case "k", "up":
		if d.selectedFieldIdx > 0 {
			d.selectedFieldIdx--
		}
	case "n":
		d.form = NewFieldForm(d.width, d.height)
		return d, d.form.Init()
	case "d":
		if len(d.fields) == 0 {
			return d, nil
		}
		f := d.fields[d.selectedFieldIdx]
		d.mode = "confirm-delete"
		d.pendingKind = "field"
		d.pendingID = f.ID
		d.confirmLabel = f.Name
	}
	return d, nil
}

// View implements tea.Model.
func (d *DashboardModel) View() string {
	if d.width <= 0 {
		d.width = 80
	}
	if d.height <= 0 {
		d.height = 24
	}
	vPadTop := EffectiveViewportTop()
	vPadBottom := ViewportInsetBottom
	vPadX := ViewportInsetX
	usableH := d.height - vPadTop - vPadBottom
	if usableH < 8 {
		// Prefer keeping a small top margin so content stays below window chrome.
		vPadBottom = 0
		vPadX = 0
		usableH = d.height - vPadTop
	}
	if usableH < 8 {
		vPadTop = 2
		usableH = d.height - vPadTop
	}
	if usableH < 8 {
		vPadTop = 0
		usableH = d.height
	}
	statusH := 1
	// No top header row — panels use full height above the status bar.
	midH := usableH - statusH
	if midH < 5 {
		midH = 5
	}

	barW := d.width - 2*vPadX
	if barW < 20 {
		barW = d.width
		vPadX = 0
	}
	innerW := barW - 2
	if innerW < 12 {
		innerW = 12
	}
	colW := innerW * 20 / 100
	midW := innerW * 50 / 100
	prevW := innerW - colW - midW - 4
	if colW < 14 {
		colW = 14
	}
	if midW < 24 {
		midW = 24
	}
	if prevW < 18 {
		prevW = 18
	}

	left := renderCollectionsPanel(d, midH, colW)
	middle := renderRowsPanel(d, midH, midW)
	right := renderPreviewPanel(d, midH, prevW)
	body := lipgloss.JoinHorizontal(lipgloss.Top, left, middle, right)

	email := ""
	if d.cfg != nil {
		email = d.cfg.Email
	}
	status := renderStatusBar(d, email, d.spinner.View(), barW)

	full := lipgloss.JoinVertical(lipgloss.Left, body, status)

	switch d.pageOverlay {
	case "settings":
		full = renderSettingsOverlay(d.cfg, barW, usableH)
	case "shortcuts":
		full = renderShortcutsOverlay(barW, usableH)
	}

	if d.accountMenuOpen {
		full = renderAccountMenu(d, barW, usableH)
	}

	if d.form != nil {
		full = d.form.View()
	}

	out := lipgloss.NewStyle().
		Padding(vPadTop, vPadX, vPadBottom, vPadX).
		Width(d.width).
		Height(d.height).
		Render(full)
	return out
}

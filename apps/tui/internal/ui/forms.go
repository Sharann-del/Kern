package ui

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/kern/kern-tui/internal/api"
)

// FormKind identifies which modal form is open.
type FormKind int

const (
	FormNewRow FormKind = iota
	FormEditRow
	FormNewCollection
	FormRenameCollection
	FormNewField
)

// FormModel is a centered modal over the dashboard.
type FormModel struct {
	kind           FormKind
	title          string
	labels         []string
	inputs         []textinput.Model
	fieldsMeta     []api.Field
	collectionID   string
	rowID          string
	focusIdx       int
	width, height  int
	errText        string
	submitting     bool
	// new field: type picker
	fieldTypes     []string
	typeCursor     int
	typePickFocus  bool // true when cycling field types (new field only)
}

var newFieldTypes = []string{
	"text", "rich_text", "number", "date", "datetime",
	"boolean", "select", "multi_select", "url", "email", "phone",
}

func newTextInput(w int) textinput.Model {
	t := textinput.New()
	t.CharLimit = 2048
	t.Width = w
	return t
}

// NewRowForm builds inputs from collection fields (simple text; select uses j/k when focused).
func NewRowForm(collectionID string, fields []api.Field, existing *api.Row, w, h int) *FormModel {
	boxW := min(48, w-8)
	var labels []string
	var inputs []textinput.Model
	var meta []api.Field
	for _, f := range fields {
		if f.Type == "relation" || f.Type == "file" {
			continue
		}
		labels = append(labels, fieldLabel(f))
		ti := newTextInput(boxW)
		if existing != nil && existing.Data != nil {
			if v, ok := existing.Data[f.Slug]; ok && v != nil {
				switch f.Type {
				case "multi_select":
					if arr, ok := v.([]any); ok {
						parts := make([]string, 0, len(arr))
						for _, x := range arr {
							parts = append(parts, fmt.Sprint(x))
						}
						ti.SetValue(strings.Join(parts, ","))
					} else {
						ti.SetValue(fmt.Sprint(v))
					}
				default:
					ti.SetValue(fmt.Sprint(v))
				}
			}
		}
		inputs = append(inputs, ti)
		meta = append(meta, f)
	}
	kind := FormNewRow
	title := "New Row"
	if existing != nil {
		kind = FormEditRow
		title = "Edit Row"
	}
	m := &FormModel{
		kind:         kind,
		title:        title,
		labels:       labels,
		inputs:       inputs,
		fieldsMeta:   meta,
		collectionID: collectionID,
		rowID:        "",
		width:        w,
		height:       h,
		fieldTypes:   newFieldTypes,
	}
	if existing != nil {
		m.rowID = existing.ID
	}
	if len(inputs) > 0 {
		m.inputs[0].Focus()
	}
	return m
}

func fieldLabel(f api.Field) string {
	suf := ""
	switch f.Type {
	case "select":
		suf = " (j/k options)"
	case "multi_select":
		suf = " (comma-separated ids)"
	case "boolean":
		suf = " (true/false)"
	}
	return f.Name + suf
}

// NewCollectionForm name, slug, icon.
func NewCollectionForm(w, h int) *FormModel {
	boxW := min(48, w-8)
	n := newTextInput(boxW)
	s := newTextInput(boxW)
	i := newTextInput(boxW)
	n.Focus()
	return &FormModel{
		kind:   FormNewCollection,
		title:  "New Collection",
		labels: []string{"Name", "Slug", "Icon (emoji)"},
		inputs: []textinput.Model{n, s, i},
		width:  w,
		height: h,
	}
}

// RenameCollectionForm single name field.
func RenameCollectionForm(current string, w, h int) *FormModel {
	boxW := min(48, w-8)
	n := newTextInput(boxW)
	n.SetValue(current)
	n.Focus()
	return &FormModel{
		kind:   FormRenameCollection,
		title:  "Rename Collection",
		labels: []string{"Name"},
		inputs: []textinput.Model{n},
		width:  w,
		height: h,
	}
}

// NewFieldForm name + type list.
func NewFieldForm(w, h int) *FormModel {
	boxW := min(48, w-8)
	n := newTextInput(boxW)
	n.Focus()
	return &FormModel{
		kind:          FormNewField,
		title:         "New Field",
		labels:        []string{"Name", "Type"},
		inputs:        []textinput.Model{n},
		width:         w,
		height:        h,
		fieldTypes:    newFieldTypes,
		typePickFocus: false,
	}
}

func (m *FormModel) Init() tea.Cmd {
	if len(m.inputs) == 0 {
		return nil
	}
	return textinput.Blink
}

func (m *FormModel) cycleSelect(delta int) {
	if m.focusIdx >= len(m.fieldsMeta) {
		return
	}
	f := m.fieldsMeta[m.focusIdx]
	if f.Type != "select" {
		return
	}
	opts := parseSelectOptions(f)
	if len(opts.Items) == 0 {
		return
	}
	cur := m.inputs[m.focusIdx].Value()
	idx := -1
	for i, it := range opts.Items {
		if it.ID == cur {
			idx = i
			break
		}
	}
	if idx < 0 {
		idx = 0
	} else {
		idx = (idx + delta + len(opts.Items)) % len(opts.Items)
	}
	m.inputs[m.focusIdx].SetValue(opts.Items[idx].ID)
}

// Update handles keyboard; returns done=true when saved or cancelled.
func (m *FormModel) Update(msg tea.Msg) (done, saved bool, cmd tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "esc":
			return true, false, nil
		case "tab", "shift+tab":
			dir := 1
			if msg.String() == "shift+tab" {
				dir = -1
			}
			if m.kind == FormNewField {
				if m.typePickFocus {
					m.typePickFocus = false
					m.inputs[0].Focus()
				} else {
					m.inputs[0].Blur()
					m.typePickFocus = true
				}
				return false, false, textinput.Blink
			}
			for i := range m.inputs {
				m.inputs[i].Blur()
			}
			m.focusIdx = (m.focusIdx + dir + len(m.inputs)) % len(m.inputs)
			if len(m.inputs) > 0 {
				m.inputs[m.focusIdx].Focus()
			}
			return false, false, textinput.Blink
		case "enter":
			if m.kind == FormNewField {
				if m.typePickFocus {
					return true, true, nil
				}
				m.inputs[0].Blur()
				m.typePickFocus = true
				return false, false, nil
			}
			if m.focusIdx == len(m.inputs)-1 || len(m.inputs) == 0 {
				return true, true, nil
			}
			for i := range m.inputs {
				m.inputs[i].Blur()
			}
			m.focusIdx++
			m.inputs[m.focusIdx].Focus()
			return false, false, textinput.Blink
		case "j", "down":
			if m.kind == FormNewField && m.typePickFocus {
				m.typeCursor = (m.typeCursor + 1) % len(m.fieldTypes)
				return false, false, nil
			}
			if m.focusIdx < len(m.fieldsMeta) {
				f := m.fieldsMeta[m.focusIdx]
				if f.Type == "select" {
					m.cycleSelect(1)
					return false, false, nil
				}
			}
		case "k", "up":
			if m.kind == FormNewField && m.typePickFocus {
				m.typeCursor = (m.typeCursor - 1 + len(m.fieldTypes)) % len(m.fieldTypes)
				return false, false, nil
			}
			if m.focusIdx < len(m.fieldsMeta) {
				f := m.fieldsMeta[m.focusIdx]
				if f.Type == "select" {
					m.cycleSelect(-1)
					return false, false, nil
				}
			}
		}
	}
	if m.kind == FormNewField {
		if m.typePickFocus {
			return false, false, nil
		}
		m.inputs[0], cmd = m.inputs[0].Update(msg)
		return false, false, cmd
	}
	if m.focusIdx >= 0 && m.focusIdx < len(m.inputs) {
		m.inputs[m.focusIdx], cmd = m.inputs[m.focusIdx].Update(msg)
	}
	return false, false, cmd
}

func (m *FormModel) View() string {
	boxW := min(48, m.width-8)
	var b strings.Builder
	b.WriteString(TitleStyle.Render(m.title))
	b.WriteString("\n\n")
	if m.kind == FormNewField {
		b.WriteString(SubtitleStyle.Render(m.labels[0]))
		b.WriteString("\n")
		b.WriteString(lipgloss.NewStyle().Width(boxW).Render(m.inputs[0].View()))
		b.WriteString("\n\n")
		b.WriteString(SubtitleStyle.Render("Type"))
		b.WriteString("\n")
		for i, t := range m.fieldTypes {
			line := "  " + t
			if m.typePickFocus && i == m.typeCursor {
				line = SelectedItemStyle.Render("▶ " + t)
			} else if !m.typePickFocus {
				line = DimStyle.Render("  " + t)
			} else {
				line = NormalItemStyle.Render(line)
			}
			b.WriteString(line + "\n")
		}
	} else {
		for i := range m.inputs {
			b.WriteString(SubtitleStyle.Render(m.labels[i]))
			b.WriteString("\n")
			b.WriteString(lipgloss.NewStyle().Width(boxW).Render(m.inputs[i].View()))
			b.WriteString("\n\n")
		}
	}
	b.WriteString(DimStyle.Render("[Enter] save   [Esc] cancel"))
	if m.errText != "" {
		b.WriteString("\n")
		b.WriteString(ErrorStyle.Render(m.errText))
	}
	fr := lipgloss.NewStyle().
		Width(boxW + 4).
		Border(SharpBorder).
		BorderForeground(Gold).
		Padding(1, 2).
		Render(b.String())
	top := EffectiveViewportTop()
	uh := m.height - top - ViewportInsetBottom
	uw := m.width - 2*ViewportInsetX
	if uh < 10 || uw < 30 {
		return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, fr)
	}
	return lipgloss.NewStyle().
		Padding(top, ViewportInsetX, ViewportInsetBottom, ViewportInsetX).
		Width(m.width).
		Height(m.height).
		Render(lipgloss.Place(uw, uh, lipgloss.Center, lipgloss.Center, fr))
}

// BuildRowData maps form inputs to row data JSON.
func (m *FormModel) BuildRowData() (map[string]any, error) {
	out := map[string]any{}
	for i, f := range m.fieldsMeta {
		if i >= len(m.inputs) {
			break
		}
		raw := strings.TrimSpace(m.inputs[i].Value())
		switch f.Type {
		case "number":
			if raw == "" {
				out[f.Slug] = nil
				continue
			}
			v, err := strconv.ParseFloat(raw, 64)
			if err != nil {
				return nil, fmt.Errorf("%s: invalid number", f.Name)
			}
			out[f.Slug] = v
		case "boolean":
			switch strings.ToLower(raw) {
			case "true", "1", "yes":
				out[f.Slug] = true
			case "false", "0", "no", "":
				out[f.Slug] = false
			default:
				return nil, fmt.Errorf("%s: use true/false", f.Name)
			}
		case "multi_select":
			if raw == "" {
				out[f.Slug] = []any{}
				break
			}
			parts := strings.Split(raw, ",")
			arr := make([]any, 0, len(parts))
			for _, p := range parts {
				p = strings.TrimSpace(p)
				if p != "" {
					arr = append(arr, p)
				}
			}
			out[f.Slug] = arr
		default:
			if raw == "" {
				out[f.Slug] = nil
			} else {
				out[f.Slug] = raw
			}
		}
	}
	return out, nil
}

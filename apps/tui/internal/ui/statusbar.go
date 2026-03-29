package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/kern/kern-tui/internal/keys"
)

func renderStatusBar(d *DashboardModel, email string, spinView string, barW int) string {
	w := barW
	if w < 10 {
		w = d.width
	}
	if w < 10 {
		return ""
	}
	left := ""
	switch {
	case d.err != nil:
		left = ErrorStyle.Render("Error: "+truncate(d.err.Error(), w/3)) + " " + KeyHintStyle.Render("["+keys.Retry+"]")
	case d.loading && len(d.collections) == 0:
		left = "Loading… " + spinView
	case d.mode == "confirm-signout":
		left = ErrorStyle.Render("Sign out?") + " " +
			KeyHintStyle.Render("["+keys.Yes+"]") + " " + KeyHintStyle.Render("["+keys.No+"]")
	case d.mode == "confirm-delete":
		left = fmt.Sprintf(`Delete %q?`, truncate(d.confirmLabel, 32)) + " " +
			KeyHintStyle.Render("["+keys.Yes+"]") + " " + KeyHintStyle.Render("["+keys.No+"]")
	case d.searchMode:
		left = SubtitleStyle.Render("Search: ") + d.searchInput.View() + " " + KeyHintStyle.Render("[Esc]") + " " + hint(keys.AccountMenu, "account")
	case d.showFieldsView && d.focusedPanel == 1:
		left = hint(keys.NewColl, "new field") + " " + hint(keys.DelRow, "delete") + " " + hint(keys.Esc, "back") + " " + hint(keys.AccountMenu, "account") + " " + hint(keys.TabFocus, "switch") + " " + hint(keys.Quit, "quit")
	case d.focusedPanel == 0:
		left = hint(keys.NewColl, "new collection") + " " + hint(keys.DelColl, "delete") + " " + hint(keys.RenameColl, "rename") + " " + hint(keys.AccountMenu, "account") + " " + hint(keys.TabFocus, "switch") + " " + hint(keys.Quit, "quit")
	case d.focusedPanel == 1:
		left = hint(keys.NewRow, "new row") + " " + hint(keys.DelRow, "delete") + " " + hint(keys.EditRow, "edit") + " " + hint(keys.Search, "search") + " " + hint(keys.Fields, "fields") + " " + hint(keys.AccountMenu, "account") + " " + hint(keys.TabFocus, "switch") + " " + hint(keys.Quit, "quit")
	default:
		left = hint(keys.TabFocus, "switch") + " " + hint(keys.AccountMenu, "account") + " " + hint(keys.Quit, "quit")
	}
	em := strings.TrimSpace(email)
	maxEm := min(40, w/3)
	if maxEm < 12 {
		maxEm = 12
	}
	right := DimStyle.Render(truncate(em, maxEm))
	rightW := lipgloss.Width(right)
	leftW := lipgloss.Width(left)
	pad := w - leftW - rightW
	for pad < 1 && maxEm > 6 {
		maxEm -= 2
		right = DimStyle.Render(truncate(em, maxEm))
		rightW = lipgloss.Width(right)
		pad = w - leftW - rightW
	}
	if pad < 1 {
		pad = 1
	}
	line := left + strings.Repeat(" ", pad) + right
	return StatusBarStyle.Width(w).Render(line)
}

func hint(key, label string) string {
	return KeyHintStyle.Render("["+key+"]") + label
}

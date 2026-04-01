package ui

import (
	"github.com/kern/kern-tui/internal/api"
)

type collectionsLoadedMsg struct {
	items []api.Collection
	err   error
}

type rowsLoadedMsg struct {
	items  []api.Row
	append bool
	err    error
}

type fieldsLoadedMsg struct {
	items []api.Field
	err   error
}

type mutationDoneMsg struct {
	err error
}

type sessionRefreshedMsg struct {
	res *api.AuthResponse
	err error
}

// signedOutMsg is sent after remote logout and local config clear; App returns to login.
type signedOutMsg struct{}

package ui

import (
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/kern/kern-tui/internal/api"
	"github.com/kern/kern-tui/internal/config"
)

// AppModel is the root Bubble Tea model (login vs dashboard).
type AppModel struct {
	state     string
	login     LoginModel
	dashboard *DashboardModel
	config    *config.Config
	client    *api.Client
	width     int
	height    int
}

// NewAppModel constructs the app.
func NewAppModel() AppModel {
	return AppModel{
		state: "loading",
		login: newLoginModel(),
	}
}

type loadConfigMsg struct {
	cfg *config.Config
	err error
}

func loadConfigCmd() tea.Cmd {
	return func() tea.Msg {
		cfg, err := config.Load()
		return loadConfigMsg{cfg: cfg, err: err}
	}
}

// Init implements tea.Model.
func (a AppModel) Init() tea.Cmd {
	return loadConfigCmd()
}

// Update implements tea.Model.
func (a AppModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		a.width = msg.Width
		a.height = msg.Height
		a.login.width = msg.Width
		a.login.height = msg.Height
		if a.dashboard != nil {
			a.dashboard.width = msg.Width
			a.dashboard.height = msg.Height
		}
	case loadConfigMsg:
		if msg.err != nil || msg.cfg == nil {
			a.state = "login"
			a.login.width = a.width
			a.login.height = a.height
			return a, a.login.Init()
		}
		a.config = msg.cfg
		if !msg.cfg.IsAuthenticated() {
			a.state = "login"
			a.login.width = a.width
			a.login.height = a.height
			return a, a.login.Init()
		}
		a.client = api.New(msg.cfg.SupabaseURL, msg.cfg.SupabaseKey, msg.cfg.AccessToken)
		uid, err := api.UserIDFromAccessToken(msg.cfg.AccessToken)
		if err != nil {
			a.state = "login"
			a.login.errText = "Invalid stored token: " + err.Error()
			a.login.width = a.width
			a.login.height = a.height
			return a, a.login.Init()
		}
		a.state = "dashboard"
		a.dashboard = newDashboard(a.client, a.config, uid, a.width, a.height)
		return a, a.dashboard.Init()

	case signedOutMsg:
		a.state = "login"
		a.client = nil
		a.dashboard = nil
		a.config = &config.Config{}
		a.login = newLoginModel()
		a.login.width = a.width
		a.login.height = a.height
		return a, a.login.Init()

	case signInResultMsg:
		if a.state != "login" {
			return a, nil
		}
		a.login.submitting = false
		if msg.err != nil {
			a.login.errText = msg.err.Error()
			return a, textinput.Blink
		}
		a.config = msg.cfg
		a.client = api.New(msg.cfg.SupabaseURL, msg.cfg.SupabaseKey, msg.cfg.AccessToken)
		uid, err := api.UserIDFromAccessToken(msg.cfg.AccessToken)
		if err != nil {
			a.login.errText = err.Error()
			return a, nil
		}
		a.state = "dashboard"
		a.dashboard = newDashboard(a.client, a.config, uid, a.width, a.height)
		return a, a.dashboard.Init()
	}

	switch a.state {
	case "loading":
		return a, nil
	case "login":
		var cmd tea.Cmd
		a.login, cmd = a.login.Update(msg)
		return a, cmd
	case "dashboard":
		if km, ok := msg.(tea.KeyMsg); ok {
			switch km.String() {
			case "ctrl+c", "q":
				if !a.dashboard.capturesKeyboard() && !a.dashboard.overlayActive() {
					return a, tea.Quit
				}
			}
		}
		var cmd tea.Cmd
		var m tea.Model
		m, cmd = a.dashboard.Update(msg)
		if dm, ok := m.(*DashboardModel); ok {
			a.dashboard = dm
		}
		return a, cmd
	}
	return a, nil
}

// View implements tea.Model.
func (a AppModel) View() string {
	switch a.state {
	case "loading":
		return lipglossPlaceLoading(a.width, a.height)
	case "login":
		// Prefer App-level size (always updated from WindowSizeMsg); login fields can lag on first frame.
		w, h := a.width, a.height
		if w <= 0 {
			w = a.login.width
		}
		if h <= 0 {
			h = a.login.height
		}
		return a.login.viewAt(w, h)
	case "dashboard":
		if a.dashboard != nil {
			return a.dashboard.View()
		}
	}
	return ""
}

func lipglossPlaceLoading(w, h int) string {
	if w <= 0 {
		w = 80
	}
	if h <= 0 {
		h = 24
	}
	s := SubtitleStyle.Render("Loading…")
	top := EffectiveViewportTop()
	uh := h - top - ViewportInsetBottom
	uw := w - 2*ViewportInsetX
	if uh < 5 || uw < 10 {
		return lipgloss.Place(w, h, lipgloss.Center, lipgloss.Center, s)
	}
	return lipgloss.NewStyle().
		Padding(top, ViewportInsetX, ViewportInsetBottom, ViewportInsetX).
		Width(w).
		Height(h).
		Render(lipgloss.Place(uw, uh, lipgloss.Center, lipgloss.Center, s))
}

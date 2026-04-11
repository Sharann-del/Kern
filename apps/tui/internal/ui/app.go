package ui

import (
	"fmt"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/Sharann-del/kern/tui/internal/api"
	"github.com/Sharann-del/kern/tui/internal/auth"
	"github.com/Sharann-del/kern/tui/internal/config"
	"github.com/Sharann-del/kern/tui/internal/db"
	loginpkg "github.com/Sharann-del/kern/tui/internal/ui/login"
)

// AppModel is the root Bubble Tea model (loading → login → dashboard).
type AppModel struct {
	state      string
	loginModel *loginpkg.Model
	dashboard  *DashboardModel
	config     *config.Config
	client     *api.Client

	supabaseURL string
	supabaseKey string

	width, height int
	loadingFrame  int
	loadingSince  time.Time
	pendingLoad   *loadConfigMsg
}

// NewAppModel constructs the root app. supabaseURL and supabaseKey come from
// the env vars SUPABASE_URL and SUPABASE_ANON_KEY loaded in cmd/root.go.
func NewAppModel(supabaseURL, supabaseKey string) AppModel {
	return AppModel{
		state:        "loading",
		loginModel:   loginpkg.New(supabaseURL, supabaseKey),
		supabaseURL:  supabaseURL,
		supabaseKey:  supabaseKey,
		loadingSince: time.Now(),
	}
}

// ─── startup: check for existing valid session ───────────────────────────────

type loadConfigMsg struct {
	cfg    *config.Config
	userID string // populated from new session format; falls back to JWT parse
	err    error
}

type loadingTickMsg time.Time

const (
	loadingFPS         = time.Second / 18
	minLoadingDuration = 3000 * time.Millisecond
)

func (a AppModel) loadSessionCmd() tea.Cmd {
	return func() tea.Msg {
		// Prefer the new ~/.config/kern/session.json when env creds are present.
		if a.supabaseURL != "" && a.supabaseKey != "" {
			d := db.New(a.supabaseURL, a.supabaseKey, "")
			if s, err := auth.LoadAndRefresh(d); err == nil && s != nil {
				cfg := &config.Config{
					SupabaseURL:  a.supabaseURL,
					SupabaseKey:  a.supabaseKey,
					AccessToken:  s.AccessToken,
					RefreshToken: s.RefreshToken,
					Email:        s.User.Email,
				}
				return loadConfigMsg{cfg: cfg, userID: s.User.ID}
			}
		}
		// Fallback: legacy ~/.kern/config.json written by the old login screen.
		cfg, err := config.Load()
		return loadConfigMsg{cfg: cfg, err: err}
	}
}

func (a AppModel) syncLoginSize() (AppModel, tea.Cmd) {
	if a.loginModel == nil || a.width <= 0 || a.height <= 0 {
		return a, nil
	}
	m, cmd := a.loginModel.Update(tea.WindowSizeMsg{Width: a.width, Height: a.height})
	if lm, ok := m.(*loginpkg.Model); ok {
		a.loginModel = lm
	}
	return a, cmd
}

func loadingTickCmd() tea.Cmd {
	return tea.Tick(loadingFPS, func(t time.Time) tea.Msg { return loadingTickMsg(t) })
}

func (a AppModel) applyLoadResult(msg loadConfigMsg) (tea.Model, tea.Cmd) {
	if msg.err != nil || msg.cfg == nil || !msg.cfg.IsAuthenticated() {
		a.state = "login"
		a.pendingLoad = nil
		a, sizeCmd := a.syncLoginSize()
		return a, tea.Batch(a.loginModel.Init(), sizeCmd)
	}
	a.config = msg.cfg
	uid := msg.userID
	if uid == "" {
		var err error
		uid, err = api.UserIDFromAccessToken(msg.cfg.AccessToken)
		if err != nil {
			a.state = "login"
			a.pendingLoad = nil
			a, sizeCmd := a.syncLoginSize()
			return a, tea.Batch(a.loginModel.Init(), sizeCmd)
		}
	}
	a.client = api.New(msg.cfg.SupabaseURL, msg.cfg.SupabaseKey, msg.cfg.AccessToken)
	a.state = "dashboard"
	a.pendingLoad = nil
	a.dashboard = newDashboard(a.client, a.config, uid, a.width, a.height)
	return a, a.dashboard.Init()
}

// ─── tea.Model ───────────────────────────────────────────────────────────────

// Init implements tea.Model.
func (a AppModel) Init() tea.Cmd {
	return tea.Batch(a.loadSessionCmd(), loadingTickCmd())
}

// Update implements tea.Model.
func (a AppModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {

	case tea.WindowSizeMsg:
		a.width, a.height = msg.Width, msg.Height
		if a.dashboard != nil {
			a.dashboard.width = msg.Width
			a.dashboard.height = msg.Height
		}
		// loginModel handles its own WindowSizeMsg in the state-switch delegation below.

	case loadingTickMsg:
		if a.state != "loading" {
			return a, nil
		}
		a.loadingFrame++
		if a.pendingLoad != nil && time.Since(a.loadingSince) >= minLoadingDuration {
			return a.applyLoadResult(*a.pendingLoad)
		}
		return a, loadingTickCmd()

	// ── startup auth check complete ──
	case loadConfigMsg:
		if a.state == "loading" && time.Since(a.loadingSince) < minLoadingDuration {
			copy := msg
			a.pendingLoad = &copy
			return a, nil
		}
		return a.applyLoadResult(msg)

	// ── new login screen reports success ──
	case loginpkg.AuthenticatedMsg:
		cfg := &config.Config{
			SupabaseURL:  a.supabaseURL,
			SupabaseKey:  a.supabaseKey,
			AccessToken:  msg.Session.AccessToken,
			RefreshToken: msg.Session.RefreshToken,
			Email:        msg.Session.User.Email,
		}
		_ = config.Save(cfg) // keep legacy config in sync for dashboard refresh logic
		a.config = cfg
		a.client = api.New(cfg.SupabaseURL, cfg.SupabaseKey, cfg.AccessToken)
		a.state = "dashboard"
		a.dashboard = newDashboard(a.client, a.config, msg.Session.User.ID, a.width, a.height)
		return a, a.dashboard.Init()

	// ── dashboard triggered sign-out ──
	case signedOutMsg:
		a.state = "login"
		a.client = nil
		a.dashboard = nil
		a.config = &config.Config{}
		a.loginModel = loginpkg.New(a.supabaseURL, a.supabaseKey)
		a, sizeCmd := a.syncLoginSize()
		return a, tea.Batch(a.loginModel.Init(), sizeCmd)
	}

	// ── delegate to the active child model ──
	switch a.state {
	case "loading":
		return a, nil

	case "login":
		if a.loginModel != nil {
			m, cmd := a.loginModel.Update(msg)
			if lm, ok := m.(*loginpkg.Model); ok {
				a.loginModel = lm
			}
			return a, cmd
		}

	case "dashboard":
		if km, ok := msg.(tea.KeyMsg); ok {
			switch km.String() {
			case "ctrl+c", "q":
				if !a.dashboard.capturesKeyboard() && !a.dashboard.overlayActive() {
					return a, tea.Quit
				}
			}
		}
		m, cmd := a.dashboard.Update(msg)
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
		return lipglossPlaceLoading(a.width, a.height, a.loadingFrame)
	case "login":
		if a.loginModel != nil {
			return a.loginModel.View()
		}
	case "dashboard":
		if a.dashboard != nil {
			return a.dashboard.View()
		}
	}
	return ""
}

func lipglossPlaceLoading(w, h, frame int) string {
	if w <= 0 {
		w = 80
	}
	if h <= 0 {
		h = 24
	}
	top := EffectiveViewportTop()
	uh := h - top - ViewportInsetBottom
	uw := w - 2*ViewportInsetX
	if uh < 5 || uw < 10 {
		return lipgloss.Place(w, h, lipgloss.Center, lipgloss.Center, GoldStyle.Render("KERN"))
	}
	content := renderLoadingScene(uw, uh, frame)
	return lipgloss.NewStyle().
		Padding(top, ViewportInsetX, ViewportInsetBottom, ViewportInsetX).
		Width(w).
		Height(h).
		Render(lipgloss.Place(uw, uh, lipgloss.Center, lipgloss.Center, content))
}

func renderLoadingScene(w, h, frame int) string {
	if w < 40 || h < 12 {
		return GoldStyle.Render("KERN")
	}

	// Simple status line (optional)
	statuses := []string{"booting"}
	status := statuses[0]

	logo := renderLoadingLogo(frame)
	progress := renderLoadingRail(maxInt(26, minInt(58, w/2)), frame)

	// Centered vertical layout with logo and progress bar
	content := lipgloss.JoinVertical(lipgloss.Center,
		logo,
		"",
		GoldStyle.Render(status),
		"",
		progress,
	)

	cardW := maxInt(lipgloss.Width(content)+8, minInt(w-2, lipgloss.Width(content)+16))
	top := renderLoadingBackdropLine(cardW-2, frame)
	bottom := renderLoadingBackdropLine(cardW-2, frame+11)
	final := lipgloss.JoinVertical(
		lipgloss.Center,
		top,
		"",
		content,
		"",
		bottom,
	)
	return lipgloss.NewStyle().
		Border(SharpBorder).
		BorderForeground(BorderSubtle).
		Padding(1, 2).
		Render(final)
}

func renderLoadingLogo(frame int) string {
	lines := []string{
		"██╗  ██╗███████╗██████╗ ███╗   ██╗",
		"██║ ██╔╝██╔════╝██╔══██╗████╗  ██║",
		"█████╔╝ █████╗  ██████╔╝██╔██╗ ██║",
		"██╔═██╗ ██╔══╝  ██╔══██╗██║╚██╗██║",
		"██║  ██╗███████╗██║  ██║██║ ╚████║",
		"╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝",
	}
	highlight := frame % len(lines)
	out := make([]string, 0, len(lines))
	for i, line := range lines {
		style := lipgloss.NewStyle().Foreground(TextSecondary)
		if i == highlight {
			style = lipgloss.NewStyle().Foreground(Gold).Bold(true)
		}
		out = append(out, style.Render(line))
	}
	return strings.Join(out, "\n")
}
func renderLoadingMatrix(w, h, frame int) string {
	if w < 10 || h < 4 {
		return ""
	}
	chars := []rune{'0', '1', '▓', '▒', '░'}
	var sb strings.Builder
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			ch := chars[(frame+y+x*7)%len(chars)]
			style := lipgloss.NewStyle().Foreground(lipgloss.AdaptiveColor{Light: "#00FF00", Dark: "#00FF00"})
			sb.WriteString(style.Render(string(ch)))
		}
		if y < h-1 {
			sb.WriteByte('\n')
		}
	}
	return sb.String()
}

func renderLoadingRail(width, frame int) string {
	if width < 12 {
		width = 12
	}
	head := frame % width
	segments := make([]string, 0, width)
	for i := 0; i < width; i++ {
		switch {
		case i == head:
			segments = append(segments, lipgloss.NewStyle().Foreground(Gold).Render("█"))
		case i > head-3 && i < head:
			segments = append(segments, lipgloss.NewStyle().Foreground(GoldDim).Render("▓"))
		default:
			segments = append(segments, lipgloss.NewStyle().Foreground(TextMuted).Render("─"))
		}
	}
	return strings.Join(segments, "")
}

func renderLoadingTelemetry(frame int) string {
	rows := []string{
		fmt.Sprintf("session probe      %s", animatedState(frame, 0)),
		fmt.Sprintf("auth transport     %s", animatedState(frame, 4)),
		fmt.Sprintf("viewport mesh      %s", animatedState(frame, 8)),
	}
	return lipgloss.JoinVertical(lipgloss.Left, rows...)
}

func renderLoadingPulse(width, frame int) string {
	if width < 16 {
		width = 16
	}
	lines := make([]string, 0, 4)
	for y := 0; y < 4; y++ {
		var b strings.Builder
		for x := 0; x < width; x++ {
			if (x+frame+y*3)%17 == 0 {
				b.WriteString(lipgloss.NewStyle().Foreground(Gold).Render("•"))
			} else if (x+y+frame)%9 == 0 {
				b.WriteString(lipgloss.NewStyle().Foreground(TextTertiary).Render("·"))
			} else {
				b.WriteByte(' ')
			}
		}
		lines = append(lines, b.String())
	}
	return strings.Join(lines, "\n")
}

func renderLoadingBackdropLine(width, frame int) string {
	if width < 24 {
		width = 24
	}
	var b strings.Builder
	for x := 0; x < width; x++ {
		switch {
		case (x+frame)%23 == 0:
			b.WriteString(lipgloss.NewStyle().Foreground(Gold).Render("◆"))
		case (x+frame)%11 == 0:
			b.WriteString(lipgloss.NewStyle().Foreground(GoldDim).Render("─"))
		case (x+frame)%5 == 0:
			b.WriteString(lipgloss.NewStyle().Foreground(BorderStrong).Render("·"))
		default:
			b.WriteString(lipgloss.NewStyle().Foreground(BorderSubtle).Render("─"))
		}
	}
	return b.String()
}

func animatedState(frame, offset int) string {
	phases := []string{"linking", "staging", "ready"}
	style := []lipgloss.Style{
		lipgloss.NewStyle().Foreground(TextMuted),
		lipgloss.NewStyle().Foreground(TextSecondary),
		lipgloss.NewStyle().Foreground(Gold),
	}
	idx := ((frame / 6) + offset) % len(phases)
	return style[idx].Render(phases[idx])
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

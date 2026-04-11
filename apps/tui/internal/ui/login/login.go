// Package login implements the Kern TUI login screen.
//
// On successful sign-in it emits AuthenticatedMsg so the parent AppModel
// can transition to the dashboard.
package login

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/spinner"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/harmonica"
	"github.com/charmbracelet/lipgloss"

	"github.com/Sharann-del/kern/tui/internal/auth"
	"github.com/Sharann-del/kern/tui/internal/db"
	"github.com/Sharann-del/kern/tui/internal/types"
)

const (
	clrGold          = "#C8A84B"
	clrBorderDim     = "#2a2825"
	clrLabelActive   = "#C8A84B"
	clrLabelInactive = "#3d3a37"
	clrText          = "#F5F4F0"
	clrPlaceholder   = "#3d3a37"
	clrDim           = "#4a4844"
	clrError         = "#7a2020"
	clrSubtle        = "#2a2825"
)

const kernBig = `██╗  ██╗███████╗██████╗ ███╗   ██╗
██║ ██╔╝██╔════╝██╔══██╗████╗  ██║
█████╔╝ █████╗  ██████╔╝██╔██╗ ██║
██╔═██╗ ██╔══╝  ██╔══██╗██║╚██╗██║
██║  ██╗███████╗██║  ██║██║ ╚████║
╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝`

const defaultFieldWidth = 36

type AuthenticatedMsg struct{ Session *types.Session }

type authResultMsg struct {
	session *types.Session
	err     error
	reqID   int
}

type signUpResultMsg struct {
	session *types.Session
	notice  string
	err     error
	reqID   int
}

type welcomeDoneMsg struct{}
type noticeClearMsg struct{}
type tickMsg time.Time

type screenState int

const (
	stateIdle screenState = iota
	stateSubmitting
	stateOAuthWaiting
	stateSuccess
	stateError
)

type authMode int

const (
	modeSignIn authMode = iota
	modeSignUp
)

type fieldAnim struct{ pos, vel float64 }

type buttonTarget int

const (
	buttonNone buttonTarget = iota
	buttonGoogle
	buttonGitHub
	buttonShowSignUp
	buttonSubmitSignUp
	buttonBackToSignIn
)

type buttonBounds struct {
	target buttonTarget
	x      int
	y      int
	w      int
	h      int
}

type renderBlock struct {
	view   string
	target buttonTarget
}

type Model struct {
	nameInput  textinput.Model
	emailInput textinput.Model
	passInput  textinput.Model
	focus      int
	mode       authMode

	spring harmonica.Spring
	anims  [3]fieldAnim

	sp            spinner.Model
	state         screenState
	oauthProvider string
	welcomeName   string
	errText       string
	noticeText    string
	lastSession   *types.Session

	supabaseURL string
	supabaseKey string

	width, height int
	buttons       []buttonBounds
	requestID     int
}

func New(supabaseURL, supabaseKey string) *Model {
	n := textinput.New()
	n.Placeholder = "John Doe"
	n.CharLimit = 120
	n.Width = defaultFieldWidth
	n.Prompt = ""
	n.TextStyle = lipgloss.NewStyle().Foreground(lipgloss.Color(clrText))
	n.PlaceholderStyle = lipgloss.NewStyle().Foreground(lipgloss.Color(clrPlaceholder))
	n.CursorStyle = lipgloss.NewStyle().Foreground(lipgloss.Color(clrGold))

	e := textinput.New()
	e.Placeholder = "you@company.com"
	e.CharLimit = 320
	e.Width = defaultFieldWidth
	e.Prompt = ""
	e.TextStyle = lipgloss.NewStyle().Foreground(lipgloss.Color(clrText))
	e.PlaceholderStyle = lipgloss.NewStyle().Foreground(lipgloss.Color(clrPlaceholder))
	e.CursorStyle = lipgloss.NewStyle().Foreground(lipgloss.Color(clrGold))
	e.Focus()

	p := textinput.New()
	p.CharLimit = 256
	p.Width = defaultFieldWidth
	p.Prompt = ""
	p.EchoMode = textinput.EchoPassword
	p.EchoCharacter = '•'
	p.TextStyle = lipgloss.NewStyle().Foreground(lipgloss.Color(clrText))
	p.PlaceholderStyle = lipgloss.NewStyle().Foreground(lipgloss.Color(clrPlaceholder))
	p.CursorStyle = lipgloss.NewStyle().Foreground(lipgloss.Color(clrGold))

	sp := spinner.New()
	sp.Spinner = spinner.Dot
	sp.Style = lipgloss.NewStyle().Foreground(lipgloss.Color(clrGold))

	m := &Model{
		nameInput:     n,
		emailInput:    e,
		passInput:     p,
		mode:          modeSignIn,
		spring:        harmonica.NewSpring(harmonica.FPS(60), 6.0, 0.8),
		anims:         [3]fieldAnim{{pos: 0.0}, {pos: 1.0}, {pos: 0.0}},
		sp:            sp,
		state:         stateIdle,
		supabaseURL:   supabaseURL,
		supabaseKey:   supabaseKey,
		width:         0,
		height:        0,
		oauthProvider: "",
	}
	m.configurePlaceholders()
	m.syncFocus()
	return m
}

func (m *Model) Init() tea.Cmd {
	return tea.Batch(textinput.Blink, doTick())
}

func doTick() tea.Cmd {
	return tea.Tick(time.Second/60, func(t time.Time) tea.Msg { return tickMsg(t) })
}

func (m *Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width, m.height = msg.Width, msg.Height
		fw := m.fieldWidthForWindow(msg.Width, msg.Height)
		m.nameInput.Width = fw
		m.emailInput.Width = fw
		m.passInput.Width = fw
		return m, nil

	case tickMsg:
		active := m.activeFieldIndexes()
		for i := range m.anims {
			tgt := 0.0
			if m.state == stateIdle || m.state == stateError {
				for pos, idx := range active {
					if idx == i && pos == m.focus {
						tgt = 1.0
						break
					}
				}
			}
			m.anims[i].pos, m.anims[i].vel = m.spring.Update(m.anims[i].pos, m.anims[i].vel, tgt)
		}
		return m, doTick()

	case spinner.TickMsg:
		if m.state == stateSubmitting || m.state == stateOAuthWaiting {
			var cmd tea.Cmd
			m.sp, cmd = m.sp.Update(msg)
			return m, cmd
		}
		return m, nil

	case authResultMsg:
		if msg.reqID != m.requestID {
			return m, nil
		}
		if msg.err != nil {
			m.state = stateError
			m.errText = normalizeSignInError(msg.err)
			return m, nil
		}
		m.state = stateSuccess
		m.lastSession = msg.session
		m.welcomeName = nameFromEmail(msg.session.User.Email)
		return m, tea.Tick(1200*time.Millisecond, func(time.Time) tea.Msg { return welcomeDoneMsg{} })

	case signUpResultMsg:
		if msg.reqID != m.requestID {
			return m, nil
		}
		if msg.err != nil {
			m.state = stateError
			m.errText = normalizeSignUpError(msg.err)
			return m, nil
		}
		if msg.session != nil {
			m.state = stateSuccess
			m.lastSession = msg.session
			m.welcomeName = firstNonEmpty(strings.TrimSpace(m.nameInput.Value()), nameFromEmail(msg.session.User.Email))
			return m, tea.Tick(1200*time.Millisecond, func(time.Time) tea.Msg { return welcomeDoneMsg{} })
		}
		m.state = stateIdle
		m.mode = modeSignIn
		m.focus = 0
		m.passInput.SetValue("")
		m.errText = ""
		m.noticeText = msg.notice
		m.configurePlaceholders()
		m.syncFocus()
		return m, tea.Tick(3*time.Second, func(time.Time) tea.Msg { return noticeClearMsg{} })

	case welcomeDoneMsg:
		return m, func() tea.Msg { return AuthenticatedMsg{Session: m.lastSession} }

	case noticeClearMsg:
		m.noticeText = ""
		return m, nil

	case tea.MouseMsg:
		if msg.Action != tea.MouseActionRelease || msg.Button != tea.MouseButtonLeft {
			return m, nil
		}
		if m.mode == modeSignUp && m.state != stateSuccess {
			for _, button := range m.buttons {
				if button.target == buttonBackToSignIn && hitButton(button, msg.X, msg.Y) {
					return m.backToSignIn()
				}
			}
		}
		if m.state == stateSubmitting || m.state == stateOAuthWaiting || m.state == stateSuccess {
			return m, nil
		}
		for _, button := range m.buttons {
			if hitButton(button, msg.X, msg.Y) {
				return m.activateButton(button.target)
			}
		}
		return m, nil

	case tea.KeyMsg:
		if m.state == stateSubmitting || m.state == stateOAuthWaiting || m.state == stateSuccess {
			if msg.String() == "ctrl+c" {
				return m, tea.Quit
			}
			if msg.String() == "esc" && m.mode == modeSignUp && m.state != stateSuccess {
				return m.backToSignIn()
			}
			return m, nil
		}

		switch msg.String() {
		case "ctrl+c":
			return m, tea.Quit

		case "esc":
			if m.mode == modeSignUp {
				return m.backToSignIn()
			}
			return m, tea.Quit

		case "tab", "shift+tab":
			m.focus = (m.focus + 1) % m.fieldCount()
			m.syncFocus()
			return m, textinput.Blink

		case "enter":
			if m.mode == modeSignUp {
				return m.submitSignUp()
			}
			return m.submitSignIn()

		case "alt+g":
			if m.mode != modeSignIn {
				return m, nil
			}
			m.state = stateOAuthWaiting
			m.oauthProvider = "google"
			m.errText = ""
			m.noticeText = ""
			reqID := m.nextRequestID()
			return m, tea.Batch(m.sp.Tick, oauthCmd(m.supabaseURL, m.supabaseKey, "google", reqID))

		case "alt+h":
			if m.mode != modeSignIn {
				return m, nil
			}
			m.state = stateOAuthWaiting
			m.oauthProvider = "github"
			m.errText = ""
			m.noticeText = ""
			reqID := m.nextRequestID()
			return m, tea.Batch(m.sp.Tick, oauthCmd(m.supabaseURL, m.supabaseKey, "github", reqID))

		case "alt+s":
			if m.mode == modeSignIn {
				return m.showSignUp()
			}
			return m.submitSignUp()
		}
	}

	var cmd tea.Cmd
	switch m.currentFieldIndex() {
	case 0:
		m.nameInput, cmd = m.nameInput.Update(msg)
	case 1:
		m.emailInput, cmd = m.emailInput.Update(msg)
	case 2:
		m.passInput, cmd = m.passInput.Update(msg)
	}
	return m, cmd
}

func (m *Model) View() string {
	w, h := m.width, m.height
	if w <= 0 {
		w = 80
	}
	if h <= 0 {
		h = 24
	}

	compact := h < 22 || w < 52
	split := m.useSplitLayout(w, h)
	fw := m.fieldWidthForWindow(w, h)
	blocks := m.renderFormBlocks(fw, compact)
	formContent := renderBlocks(blocks)
	_, formH := blocksSize(blocks)

	if !split {
		m.buttons = m.layoutButtonsInBox(blocks, 0, 0, w, h)
		return lipgloss.Place(w, h, lipgloss.Center, lipgloss.Center, formContent)
	}

	leftW, rightW, gap := splitDimensions(w)
	panelH := maxInt(formH, 16)
	brand := lipgloss.Place(leftW, panelH, lipgloss.Center, lipgloss.Center, m.renderBrandPanel(leftW, compact))
	form := lipgloss.Place(rightW, panelH, lipgloss.Center, lipgloss.Center, formContent)
	divider := renderDivider(panelH, gap)
	content := lipgloss.JoinHorizontal(lipgloss.Top, brand, divider, form)

	contentW := leftW + gap + rightW
	x0 := maxInt(0, (w-contentW)/2)
	y0 := maxInt(0, (h-panelH)/2)
	m.buttons = m.layoutButtonsInBox(blocks, x0+leftW+gap, y0, rightW, panelH)

	return lipgloss.Place(w, h, lipgloss.Center, lipgloss.Center, content)
}

func (m *Model) renderFormBlocks(fw int, compact bool) []renderBlock {
	blocks := []renderBlock{
		{view: m.renderIntro()},
		{view: conditionalSpacer(compact)},
	}
	for _, idx := range m.activeFieldIndexes() {
		blocks = append(blocks, renderBlock{view: m.renderField(idx, fw)})
		if !compact {
			blocks = append(blocks, renderBlock{view: ""})
		}
	}
	blocks = append(blocks, renderBlock{view: m.renderStatus()})
	blocks = append(blocks, m.renderActionBlocks(fw, compact)...)
	return blocks
}

func (m *Model) renderIntro() string {
	titleStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color(clrGold)).
		Bold(true).
		Padding(0, 1).
		Border(lipgloss.NormalBorder(), false, false, true, false).
		BorderForeground(lipgloss.Color(clrBorderDim))
	dimStyle := lipgloss.NewStyle().Foreground(lipgloss.Color(clrDim))
	if m.mode == modeSignUp {
		return lipgloss.JoinVertical(lipgloss.Center,
			titleStyle.Render("Create account"),
			dimStyle.Render("Create your Kern account in the terminal."),
		)
	}
	return lipgloss.JoinVertical(lipgloss.Center,
		titleStyle.Render("Sign in"),
		dimStyle.Render("Use your account email and password."),
	)
}

func (m *Model) renderTitle(compact bool) string {
	if compact {
		return lipgloss.NewStyle().
			Foreground(lipgloss.Color(clrGold)).
			Bold(true).
			Render("KERN")
	}
	return lipgloss.NewStyle().Foreground(lipgloss.Color(clrGold)).Render(kernBig)
}

func (m *Model) renderBrandPanel(width int, compact bool) string {
	title := m.renderTitle(compact)
	tagline := lipgloss.NewStyle().
		Foreground(lipgloss.Color(clrText)).
		Bold(true).
		Render("Kern in the terminal")
	body := lipgloss.NewStyle().
		Foreground(lipgloss.Color(clrDim)).
		Width(maxInt(20, width-4)).
		Align(lipgloss.Center).
		Render("Sign in or create your account on the right. Everything stays inside the terminal.")
	return lipgloss.JoinVertical(lipgloss.Center, title, "", tagline, "", body)
}

func (m *Model) renderActionBlocks(fw int, compact bool) []renderBlock {
	if m.mode == modeSignUp {
		blocks := []renderBlock{
			{view: conditionalSpacer(compact)},
			{view: m.renderButton("Create account", false), target: buttonSubmitSignUp},
			{view: conditionalSpacer(compact)},
			{view: m.renderButton("Back to sign in", true), target: buttonBackToSignIn},
		}
		return blocks
	}

	divStyle := lipgloss.NewStyle().Foreground(lipgloss.Color(clrSubtle))
	dashCount := (fw - 4) / 2
	if dashCount < 1 {
		dashCount = 1
	}
	dashes := strings.Repeat("─", dashCount)
	divider := divStyle.Render(dashes + " or " + dashes)

	return []renderBlock{
		{view: conditionalSpacer(compact)},
		{view: divider},
		{view: conditionalSpacer(compact)},
		{view: m.renderButton("Continue with Google", false), target: buttonGoogle},
		{view: conditionalSpacer(compact)},
		{view: m.renderButton("Continue with GitHub", false), target: buttonGitHub},
		{view: conditionalSpacer(compact)},
		{view: m.renderButton("Create account", true), target: buttonShowSignUp},
	}
}

func (m *Model) renderField(idx, fw int) string {
	var label string
	var ti textinput.Model

	switch idx {
	case 0:
		label = "Full name"
		ti = m.nameInput
	case 1:
		label = "Email"
		ti = m.emailInput
	default:
		label = "Password"
		ti = m.passInput
	}

	t := clamp01(m.anims[idx].pos)
	labelColor := lerpColor(clrLabelInactive, clrLabelActive, t)
	borderColor := lerpColor(clrBorderDim, clrGold, t)

	labelStr := lipgloss.NewStyle().Foreground(labelColor).Render(label)
	inputStr := lipgloss.NewStyle().
		Border(lipgloss.Border{Bottom: "─"}, false, false, true, false).
		BorderForeground(borderColor).
		Width(fw).
		Render(ti.View())

	return lipgloss.JoinVertical(lipgloss.Center, labelStr, inputStr)
}

func (m *Model) renderButton(label string, subtle bool) string {
	border := clrGold
	fg := clrText
	bg := ""
	if subtle {
		border = clrBorderDim
		fg = clrDim
	}
	style := lipgloss.NewStyle().
		Padding(0, 2).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(border)).
		Foreground(lipgloss.Color(fg))
	if bg != "" {
		style = style.Background(lipgloss.Color(bg))
	}
	return style.Render(label)
}

func (m *Model) renderStatus() string {
	switch m.state {
	case stateSubmitting:
		action := "authenticating..."
		if m.mode == modeSignUp {
			action = "creating account..."
		}
		return lipgloss.NewStyle().Foreground(lipgloss.Color(clrGold)).Render(m.sp.View() + " " + action)

	case stateOAuthWaiting:
		return lipgloss.NewStyle().
			Foreground(lipgloss.Color(clrGold)).
			Render(m.sp.View() + " waiting for " + m.oauthProvider + " authentication in browser...")

	case stateSuccess:
		return lipgloss.NewStyle().
			Foreground(lipgloss.Color(clrGold)).
			Bold(true).
			Render("welcome, " + m.welcomeName)

	case stateError:
		return lipgloss.NewStyle().
			Foreground(lipgloss.Color(clrError)).
			Render(m.errText)

	default:
		if m.noticeText != "" {
			return lipgloss.NewStyle().
				Foreground(lipgloss.Color(clrDim)).
				Render(m.noticeText)
		}
		copy := "› press enter to sign in"
		if m.mode == modeSignUp {
			copy = "› create your account in the terminal"
		}
		return lipgloss.NewStyle().
			Foreground(lipgloss.Color(clrDim)).
			Render(copy)
	}
}

func (m *Model) submitSignIn() (tea.Model, tea.Cmd) {
	email := strings.TrimSpace(m.emailInput.Value())
	pass := m.passInput.Value()
	if email == "" || pass == "" {
		m.state = stateError
		m.errText = "email and password are required"
		return m, nil
	}
	m.state = stateSubmitting
	m.errText = ""
	m.noticeText = ""
	reqID := m.nextRequestID()
	return m, tea.Batch(m.sp.Tick, signInCmd(m.supabaseURL, m.supabaseKey, email, pass, reqID))
}

func (m *Model) submitSignUp() (tea.Model, tea.Cmd) {
	fullName := strings.TrimSpace(m.nameInput.Value())
	email := strings.TrimSpace(m.emailInput.Value())
	pass := m.passInput.Value()
	switch {
	case fullName == "":
		m.state = stateError
		m.errText = "full name is required"
		return m, nil
	case email == "" || pass == "":
		m.state = stateError
		m.errText = "email and password are required"
		return m, nil
	}
	m.state = stateSubmitting
	m.errText = ""
	m.noticeText = ""
	reqID := m.nextRequestID()
	return m, tea.Batch(m.sp.Tick, signUpCmd(m.supabaseURL, m.supabaseKey, fullName, email, pass, reqID))
}

func (m *Model) activateButton(target buttonTarget) (tea.Model, tea.Cmd) {
	switch target {
	case buttonGoogle:
		if m.mode != modeSignIn {
			return m, nil
		}
		m.state = stateOAuthWaiting
		m.oauthProvider = "google"
		m.errText = ""
		m.noticeText = ""
		reqID := m.nextRequestID()
		return m, tea.Batch(m.sp.Tick, oauthCmd(m.supabaseURL, m.supabaseKey, "google", reqID))
	case buttonGitHub:
		if m.mode != modeSignIn {
			return m, nil
		}
		m.state = stateOAuthWaiting
		m.oauthProvider = "github"
		m.errText = ""
		m.noticeText = ""
		reqID := m.nextRequestID()
		return m, tea.Batch(m.sp.Tick, oauthCmd(m.supabaseURL, m.supabaseKey, "github", reqID))
	case buttonShowSignUp:
		return m.showSignUp()
	case buttonSubmitSignUp:
		return m.submitSignUp()
	case buttonBackToSignIn:
		return m.backToSignIn()
	default:
		return m, nil
	}
}

func (m *Model) fieldWidthForWindow(w, h int) int {
	fw := defaultFieldWidth
	if m.useSplitLayout(w, h) {
		_, rightW, _ := splitDimensions(w)
		if rightW-6 < fw {
			fw = rightW - 6
		}
	} else if w > 0 && w-4 < fw {
		fw = w - 4
	}
	if fw < 20 {
		fw = 20
	}
	return fw
}

func (m *Model) layoutButtonsInBox(blocks []renderBlock, originX, originY, boxW, boxH int) []buttonBounds {
	contentWidth := 0
	contentHeight := 0
	for _, block := range blocks {
		if bw := lipgloss.Width(block.view); bw > contentWidth {
			contentWidth = bw
		}
		contentHeight += lipgloss.Height(block.view)
	}
	if contentWidth <= 0 {
		contentWidth = 1
	}
	if contentHeight <= 0 {
		contentHeight = 1
	}

	x0 := originX + maxInt(0, (boxW-contentWidth)/2)
	y := originY + maxInt(0, (boxH-contentHeight)/2)
	buttons := make([]buttonBounds, 0, 4)
	for _, block := range blocks {
		bw := lipgloss.Width(block.view)
		bh := lipgloss.Height(block.view)
		if block.target != buttonNone {
			x := x0 + maxInt(0, (contentWidth-bw)/2)
			buttons = append(buttons, buttonBounds{
				target: block.target,
				x:      x,
				y:      y,
				w:      bw,
				h:      bh,
			})
		}
		y += bh
	}
	return buttons
}

func (m *Model) fieldCount() int {
	if m.mode == modeSignUp {
		return 3
	}
	return 2
}

func (m *Model) activeFieldIndexes() []int {
	if m.mode == modeSignUp {
		return []int{0, 1, 2}
	}
	return []int{1, 2}
}

func (m *Model) currentFieldIndex() int {
	return m.activeFieldIndexes()[m.focus]
}

func (m *Model) showSignUp() (tea.Model, tea.Cmd) {
	m.requestID++
	m.mode = modeSignUp
	m.focus = 0
	m.errText = ""
	m.noticeText = ""
	m.state = stateIdle
	m.configurePlaceholders()
	m.syncFocus()
	return m, textinput.Blink
}

func (m *Model) backToSignIn() (tea.Model, tea.Cmd) {
	m.requestID++
	m.mode = modeSignIn
	m.focus = 0
	m.errText = ""
	m.noticeText = ""
	m.state = stateIdle
	m.configurePlaceholders()
	m.syncFocus()
	return m, textinput.Blink
}

func (m *Model) nextRequestID() int {
	m.requestID++
	return m.requestID
}

func (m *Model) configurePlaceholders() {
	if m.mode == modeSignUp {
		m.passInput.Placeholder = "Choose a password"
		return
	}
	m.passInput.Placeholder = "Password"
}

func (m *Model) syncFocus() {
	m.nameInput.Blur()
	m.emailInput.Blur()
	m.passInput.Blur()

	switch m.currentFieldIndex() {
	case 0:
		m.nameInput.Focus()
	case 1:
		m.emailInput.Focus()
	case 2:
		m.passInput.Focus()
	}
}

func signInCmd(rawURL, key, email, pass string, reqID int) tea.Cmd {
	return func() tea.Msg {
		if rawURL == "" || key == "" {
			return authResultMsg{err: fmt.Errorf("SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env or environment"), reqID: reqID}
		}
		d := db.New(rawURL, key, "")
		s, err := d.SignIn(email, pass)
		if err != nil {
			return authResultMsg{err: err, reqID: reqID}
		}
		_ = auth.Save(s)
		return authResultMsg{session: s, reqID: reqID}
	}
}

func signUpCmd(rawURL, key, fullName, email, pass string, reqID int) tea.Cmd {
	return func() tea.Msg {
		if rawURL == "" || key == "" {
			return signUpResultMsg{err: fmt.Errorf("SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env or environment"), reqID: reqID}
		}
		d := db.New(rawURL, key, "")
		s, err := d.SignUp(fullName, email, pass)
		if err != nil {
			return signUpResultMsg{err: err, reqID: reqID}
		}
		if s == nil {
			signedIn, signInErr := d.SignIn(email, pass)
			switch {
			case signInErr == nil && signedIn != nil:
				_ = auth.Save(signedIn)
				return signUpResultMsg{session: signedIn, reqID: reqID}
			case isEmailNotConfirmedErr(signInErr):
				return signUpResultMsg{notice: "account created, check your email to confirm sign in", reqID: reqID}
			case isInvalidCredentialsErr(signInErr), isAlreadyRegisteredErr(signInErr):
				return signUpResultMsg{err: fmt.Errorf("User already registered"), reqID: reqID}
			case signInErr != nil:
				return signUpResultMsg{err: signInErr, reqID: reqID}
			default:
				return signUpResultMsg{notice: "account created, check your email to confirm sign in", reqID: reqID}
			}
		}
		_ = auth.Save(s)
		return signUpResultMsg{session: s, reqID: reqID}
	}
}

func oauthCmd(supabaseURL, anonKey, provider string, reqID int) tea.Cmd {
	return func() tea.Msg {
		if supabaseURL == "" || anonKey == "" {
			return authResultMsg{err: fmt.Errorf("SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env or environment"), reqID: reqID}
		}
		result := auth.StartOAuthFlow(supabaseURL, anonKey, provider)
		return authResultMsg{session: result.Session, err: result.Err, reqID: reqID}
	}
}

func normalizeSignInError(err error) string {
	msg := strings.ToLower(extractError(err))
	switch {
	case strings.Contains(msg, "invalid login credentials"),
		strings.Contains(msg, "invalid_credentials"):
		return "incorrect email or password"
	case strings.Contains(msg, "user not found"),
		strings.Contains(msg, "account_not_found"):
		return "account doesn't exist"
	case strings.Contains(msg, "email not confirmed"),
		strings.Contains(msg, "email_not_confirmed"):
		return "check your email to confirm your account"
	default:
		return extractError(err)
	}
}

func normalizeSignUpError(err error) string {
	msg := strings.ToLower(extractError(err))
	switch {
	case strings.Contains(msg, "user already registered"),
		strings.Contains(msg, "already registered"),
		strings.Contains(msg, "already exists"),
		strings.Contains(msg, "user_already_exists"):
		return "account already exists, sign in instead"
	default:
		return extractError(err)
	}
}

func isEmailNotConfirmedErr(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(extractError(err))
	return strings.Contains(msg, "email not confirmed") || strings.Contains(msg, "email_not_confirmed")
}

func isInvalidCredentialsErr(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(extractError(err))
	return strings.Contains(msg, "invalid login credentials") || strings.Contains(msg, "invalid_credentials")
}

func isAlreadyRegisteredErr(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(extractError(err))
	return strings.Contains(msg, "user already registered") ||
		strings.Contains(msg, "already registered") ||
		strings.Contains(msg, "already exists") ||
		strings.Contains(msg, "user_already_exists")
}

func extractError(err error) string {
	msg := err.Error()
	if i := strings.LastIndex(msg, "— "); i >= 0 {
		msg = strings.TrimSpace(msg[i+2:])
	}
	var apiErr struct {
		ErrorDesc string `json:"error_description"`
		Msg       string `json:"msg"`
		Message   string `json:"message"`
		ErrorCode string `json:"error_code"`
	}
	if json.Unmarshal([]byte(msg), &apiErr) == nil {
		switch {
		case apiErr.ErrorDesc != "":
			return apiErr.ErrorDesc
		case apiErr.Msg != "":
			return apiErr.Msg
		case apiErr.Message != "":
			return apiErr.Message
		case apiErr.ErrorCode != "":
			return apiErr.ErrorCode
		}
	}
	return msg
}

func nameFromEmail(email string) string {
	if i := strings.IndexByte(email, '@'); i > 0 {
		return email[:i]
	}
	return email
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

func lerpColor(from, to string, t float64) lipgloss.Color {
	if t <= 0 {
		return lipgloss.Color(from)
	}
	if t >= 1 {
		return lipgloss.Color(to)
	}
	r1, g1, b1 := parseHex(from)
	r2, g2, b2 := parseHex(to)
	r := r1 + int(float64(r2-r1)*t)
	g := g1 + int(float64(g2-g1)*t)
	b := b1 + int(float64(b2-b1)*t)
	return lipgloss.Color(fmt.Sprintf("#%02x%02x%02x", r, g, b))
}

func parseHex(hex string) (r, g, b int) {
	hex = strings.TrimPrefix(hex, "#")
	fmt.Sscanf(hex, "%02x%02x%02x", &r, &g, &b)
	return
}

func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

func hitButton(button buttonBounds, x, y int) bool {
	return x >= button.x && x < button.x+button.w && y >= button.y && y < button.y+button.h
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

func renderBlocks(blocks []renderBlock) string {
	rows := make([]string, 0, len(blocks))
	for _, block := range blocks {
		rows = append(rows, block.view)
	}
	return lipgloss.JoinVertical(lipgloss.Center, rows...)
}

func blocksSize(blocks []renderBlock) (int, int) {
	width := 0
	height := 0
	for _, block := range blocks {
		width = maxInt(width, lipgloss.Width(block.view))
		height += lipgloss.Height(block.view)
	}
	return width, maxInt(1, height)
}

func (m *Model) useSplitLayout(w, h int) bool {
	return w >= 90 && h >= 18
}

func splitDimensions(w int) (int, int, int) {
	gap := 4
	usable := maxInt(70, w-8)
	panel := maxInt(28, (usable-gap)/2)
	left := panel
	right := panel
	return left, right, gap
}

func renderDivider(height, width int) string {
	if width <= 0 {
		width = 1
	}
	col := strings.Repeat(" ", maxInt(0, width/2)) + "│"
	lines := make([]string, 0, height)
	for i := 0; i < height; i++ {
		lines = append(lines, lipgloss.NewStyle().Foreground(lipgloss.Color(clrSubtle)).Width(width).Render(col))
	}
	return strings.Join(lines, "\n")
}

func conditionalSpacer(compact bool) string {
	if compact {
		return ""
	}
	return ""
}

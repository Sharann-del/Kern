package ui

import (
	"os"
	"strings"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/Sharann-del/kern/tui/internal/api"
	"github.com/Sharann-del/kern/tui/internal/config"
)

// LoginModel is the sign-in form.
type LoginModel struct {
	urlIn     textinput.Model
	anonIn    textinput.Model
	emailIn   textinput.Model
	passIn    textinput.Model
	focus     int
	errText   string
	submitting bool
	width     int
	height    int
}

func newLoginModel() LoginModel {
	u := textinput.New()
	u.Placeholder = "https://xxxx.supabase.co"
	u.CharLimit = 256
	u.Width = 40

	a := textinput.New()
	a.Placeholder = "anon key (or set KERN_SUPABASE_ANON_KEY)"
	a.CharLimit = 512
	a.Width = 40
	if v := os.Getenv("KERN_SUPABASE_ANON_KEY"); v != "" {
		a.SetValue(v)
	}

	e := textinput.New()
	e.Placeholder = "you@example.com"
	e.CharLimit = 320
	e.Width = 40

	p := textinput.New()
	p.Placeholder = "password"
	p.EchoMode = textinput.EchoPassword
	p.CharLimit = 256
	p.Width = 40

	u.Focus()
	return LoginModel{
		urlIn:   u,
		anonIn:  a,
		emailIn: e,
		passIn:  p,
		focus:   0,
	}
}

func (m LoginModel) activeInput() *textinput.Model {
	switch m.focus {
	case 0:
		return &m.urlIn
	case 1:
		return &m.anonIn
	case 2:
		return &m.emailIn
	default:
		return &m.passIn
	}
}

// Init implements tea.Model.
func (m LoginModel) Init() tea.Cmd {
	return textinput.Blink
}

type signInResultMsg struct {
	cfg *config.Config
	err error
}

func submitSignIn(url, anon, email, pass string) tea.Cmd {
	return func() tea.Msg {
		url = strings.TrimSpace(url)
		anon = strings.TrimSpace(anon)
		email = strings.TrimSpace(email)
		if anon == "" {
			anon = os.Getenv("KERN_SUPABASE_ANON_KEY")
		}
		resp, err := api.SignIn(url, anon, email, pass)
		if err != nil {
			return signInResultMsg{err: err}
		}
		em := email
		if resp.User.Email != "" {
			em = resp.User.Email
		}
		cfg := &config.Config{
			SupabaseURL:  url,
			SupabaseKey:  anon,
			AccessToken:  resp.AccessToken,
			RefreshToken: resp.RefreshToken,
			Email:        em,
		}
		if err := config.Save(cfg); err != nil {
			return signInResultMsg{err: err}
		}
		return signInResultMsg{cfg: cfg}
	}
}

// Update implements tea.Model.
func (m LoginModel) Update(msg tea.Msg) (LoginModel, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		if m.submitting {
			return m, nil
		}
		switch msg.String() {
		case "tab", "shift+tab":
			if msg.String() == "shift+tab" {
				m.focus = (m.focus + 3) % 4
			} else {
				m.focus = (m.focus + 1) % 4
			}
			m.urlIn.Blur()
			m.anonIn.Blur()
			m.emailIn.Blur()
			m.passIn.Blur()
			switch m.focus {
			case 0:
				m.urlIn.Focus()
			case 1:
				m.anonIn.Focus()
			case 2:
				m.emailIn.Focus()
			default:
				m.passIn.Focus()
			}
			return m, textinput.Blink

		case "enter":
			m.errText = ""
			url := strings.TrimSpace(m.urlIn.Value())
			anon := strings.TrimSpace(m.anonIn.Value())
			if anon == "" {
				anon = os.Getenv("KERN_SUPABASE_ANON_KEY")
			}
			email := strings.TrimSpace(m.emailIn.Value())
			pass := m.passIn.Value()
			if url == "" || anon == "" || email == "" || pass == "" {
				m.errText = "URL, anon key, email, and password are required."
				return m, nil
			}
			m.submitting = true
			return m, submitSignIn(url, anon, email, pass)

		case "ctrl+c", "esc":
			return m, tea.Quit
		}
	}

	var cmd tea.Cmd
	switch m.focus {
	case 0:
		m.urlIn, cmd = m.urlIn.Update(msg)
	case 1:
		m.anonIn, cmd = m.anonIn.Update(msg)
	case 2:
		m.emailIn, cmd = m.emailIn.Update(msg)
	default:
		m.passIn, cmd = m.passIn.Update(msg)
	}
	return m, cmd
}

// View implements tea.Model (uses stored terminal size from WindowSizeMsg).
func (m LoginModel) View() string {
	return m.viewAt(m.width, m.height)
}

// viewAt renders the login form centered in a w×h canvas (caller passes real terminal size).
func (m LoginModel) viewAt(w, h int) string {
	if w <= 0 {
		w = 80
	}
	if h <= 0 {
		h = 24
	}
	boxW := min(56, w-4)
	if boxW < 28 {
		boxW = min(28, w-4)
	}

	title := GoldStyle.Render("kern")
	sub := SubtitleStyle.Render("personal data OS")

	label := func(s string) string { return SubtitleStyle.Render(s) }
	field := func(ti textinput.Model) string {
		return lipgloss.NewStyle().Width(boxW).Render(ti.View())
	}

	var b strings.Builder
	b.WriteString(label("Supabase URL"))
	b.WriteString("\n")
	b.WriteString(field(m.urlIn))
	b.WriteString("\n\n")
	b.WriteString(label("Anon key"))
	b.WriteString("\n")
	b.WriteString(field(m.anonIn))
	b.WriteString("\n\n")
	b.WriteString(label("Email"))
	b.WriteString("\n")
	b.WriteString(field(m.emailIn))
	b.WriteString("\n\n")
	b.WriteString(label("Password"))
	b.WriteString("\n")
	b.WriteString(field(m.passIn))
	b.WriteString("\n\n")
	btn := lipgloss.NewStyle().Foreground(Gold).Render("    [ Sign in ]")
	b.WriteString(lipgloss.NewStyle().Width(boxW).Align(lipgloss.Center).Render(btn))

	if m.errText != "" {
		b.WriteString("\n\n")
		b.WriteString(ErrorStyle.Render(m.errText))
	}
	if m.submitting {
		b.WriteString("\n\n")
		b.WriteString(DimStyle.Render("Signing in…"))
	}

	inner := b.String()
	fr := lipgloss.NewStyle().
		Width(boxW + 4).
		Border(SharpBorder).
		BorderForeground(BorderDefault).
		Padding(1, 2).
		Render(lipgloss.JoinVertical(lipgloss.Left,
			lipgloss.NewStyle().Width(boxW).Align(lipgloss.Center).Render(title),
			lipgloss.NewStyle().Width(boxW).Align(lipgloss.Center).Render(sub),
			"",
			inner,
		))

	return lipgloss.Place(w, h, lipgloss.Center, lipgloss.Center, fr)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

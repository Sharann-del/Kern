package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/Sharann-del/kern/tui/internal/db"
	"github.com/Sharann-del/kern/tui/internal/types"
)

// OAuthResult is the value returned by StartOAuthFlow.
type OAuthResult struct {
	Session *types.Session
	Err     error
}

// StartOAuthFlow starts a local HTTP callback server, generates PKCE params,
// opens the user's browser at the Supabase OAuth URL, waits up to 5 minutes
// for the authorization code, exchanges it for a Session, saves it to disk,
// and returns the result.
//
// provider is "google" or "github" (matches Supabase provider names).
func StartOAuthFlow(supabaseURL, anonKey, provider string) OAuthResult {
	// Bind to a random free local port.
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return OAuthResult{Err: fmt.Errorf("oauth: bind port: %w", err)}
	}
	port := ln.Addr().(*net.TCPAddr).Port
	callbackURL := fmt.Sprintf("http://127.0.0.1:%d/callback", port)

	// PKCE code_verifier + code_challenge.
	verifier, challenge, err := generatePKCE()
	if err != nil {
		ln.Close()
		return OAuthResult{Err: fmt.Errorf("oauth: pkce: %w", err)}
	}

	// Build Supabase authorization URL.
	q := url.Values{}
	q.Set("provider", provider)
	q.Set("redirect_to", callbackURL)
	q.Set("flow_type", "pkce")
	q.Set("code_challenge", challenge)
	q.Set("code_challenge_method", "S256")
	authURL := strings.TrimRight(supabaseURL, "/") + "/auth/v1/authorize?" + q.Encode()

	// Channel that receives the auth code from the local callback.
	codeCh := make(chan string, 1)

	mux := http.NewServeMux()
	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "missing code", http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, callbackPage)
		// Non-blocking send: if nobody is reading (e.g. timeout already fired) discard.
		select {
		case codeCh <- code:
		default:
		}
	})

	srv := &http.Server{Handler: mux}
	go srv.Serve(ln) //nolint:errcheck
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		srv.Shutdown(ctx) //nolint:errcheck
	}()

	if err := OpenBrowser(authURL); err != nil {
		return OAuthResult{Err: fmt.Errorf("oauth: open browser: %w", err)}
	}

	select {
	case code := <-codeCh:
		d := db.New(supabaseURL, anonKey, "")
		s, err := d.ExchangeCode(code, verifier)
		if err != nil {
			return OAuthResult{Err: fmt.Errorf("oauth: exchange code: %w", err)}
		}
		_ = Save(s)
		return OAuthResult{Session: s}

	case <-time.After(5 * time.Minute):
		return OAuthResult{Err: fmt.Errorf("timed out waiting for browser authentication")}
	}
}

// OpenBrowser opens url in the user's default browser.
func OpenBrowser(rawURL string) error {
	var cmd string
	var args []string
	switch runtime.GOOS {
	case "darwin":
		cmd, args = "open", []string{rawURL}
	case "linux":
		cmd, args = "xdg-open", []string{rawURL}
	case "windows":
		cmd, args = "cmd", []string{"/c", "start", rawURL}
	default:
		return fmt.Errorf("unsupported OS: %s", runtime.GOOS)
	}
	return exec.Command(cmd, args...).Start()
}

// generatePKCE returns a base64url-encoded verifier and its SHA-256 challenge.
func generatePKCE() (verifier, challenge string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return
	}
	verifier = base64.RawURLEncoding.EncodeToString(b)
	h := sha256.Sum256([]byte(verifier))
	challenge = base64.RawURLEncoding.EncodeToString(h[:])
	return
}

const callbackPage = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Kern — authenticated</title>
<style>
  body{background:#0d0d0b;color:#F5F4F0;font-family:system-ui,sans-serif;
       display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
  .card{text-align:center;padding:48px}
  .check{font-size:48px;color:#C8A84B}
  h1{font-size:1.4rem;font-weight:600;margin:.5rem 0;color:#C8A84B}
  p{color:#6B6B64;margin:.25rem 0}
</style>
</head>
<body>
  <div class="card">
    <div class="check">✓</div>
    <h1>Authenticated</h1>
    <p>You can close this tab and return to Kern.</p>
  </div>
</body>
</html>`

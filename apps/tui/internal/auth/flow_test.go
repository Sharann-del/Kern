package auth

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sharann-del/kern/tui/internal/config"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

type timeoutErr struct{}

func (timeoutErr) Error() string   { return "timeout" }
func (timeoutErr) Timeout() bool   { return true }
func (timeoutErr) Temporary() bool { return true }

func testConfig(baseURL string) Config {
	return Config{
		SupabaseURL: baseURL,
		SupabaseKey: "anon",
	}
}

func writeConfig(t *testing.T, cfg Config) {
	t.Helper()
	if err := config.Save(&cfg); err != nil {
		t.Fatalf("config.Save: %v", err)
	}
}

func authJSON(email string) string {
	return `{"access_token":"access","refresh_token":"refresh","expires_in":3600,"token_type":"bearer","user":{"id":"user-1","email":"` + email + `","user_metadata":{"full_name":"John Doe"}}}`
}

func withTempHome(t *testing.T) {
	t.Helper()
	home := t.TempDir()
	t.Setenv("HOME", home)
}

func TestSignInSuccess(t *testing.T) {
	withTempHome(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Path; got != "/auth/v1/token" {
			t.Fatalf("path = %s", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(authJSON("user@example.com")))
	}))
	defer server.Close()

	session, err := SignIn(testConfig(server.URL), "user@example.com", "password")
	if err != nil {
		t.Fatalf("SignIn: %v", err)
	}
	if session.User.Name != "John Doe" {
		t.Fatalf("User.Name = %q", session.User.Name)
	}
	if _, err := os.Stat(filepath.Join(os.Getenv("HOME"), ".kern", "session.json")); err != nil {
		t.Fatalf("saved session missing: %v", err)
	}
}

func TestSignInInvalidCredentials(t *testing.T) {
	withTempHome(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"msg":"Invalid login credentials"}`, http.StatusBadRequest)
	}))
	defer server.Close()

	_, err := SignIn(testConfig(server.URL), "user@example.com", "bad")
	if !errors.Is(err, ErrInvalidCredentials) && err != ErrInvalidCredentials {
		t.Fatalf("expected ErrInvalidCredentials, got %v", err)
	}
}

func TestSignInAccountNotFound(t *testing.T) {
	withTempHome(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"msg":"account missing"}`, http.StatusUnprocessableEntity)
	}))
	defer server.Close()

	_, err := SignIn(testConfig(server.URL), "missing@example.com", "bad")
	if !errors.Is(err, ErrAccountNotFound) && err != ErrAccountNotFound {
		t.Fatalf("expected ErrAccountNotFound, got %v", err)
	}
}

func TestSignInNetworkFailure(t *testing.T) {
	withTempHome(t)
	prev := authHTTPClient
	authHTTPClient = &http.Client{
		Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
			return nil, timeoutErr{}
		}),
	}
	t.Cleanup(func() { authHTTPClient = prev })

	_, err := SignIn(testConfig("http://example.com"), "user@example.com", "password")
	if err != ErrNetworkFailure {
		t.Fatalf("expected ErrNetworkFailure, got %v", err)
	}
}

func TestSignUpSuccessAutoSignsIn(t *testing.T) {
	withTempHome(t)
	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/auth/v1/signup":
			calls.Add(1)
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), `"full_name":"John Doe"`) {
				t.Fatalf("signup body missing full_name: %s", string(body))
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"id":"signup-ok"}`))
		case "/auth/v1/token":
			calls.Add(1)
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(authJSON("john@example.com")))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	session, err := SignUp(testConfig(server.URL), "john@example.com", "password123", "John Doe")
	if err != nil {
		t.Fatalf("SignUp: %v", err)
	}
	if session.User.Email != "john@example.com" {
		t.Fatalf("email = %q", session.User.Email)
	}
	if calls.Load() != 2 {
		t.Fatalf("expected 2 auth calls, got %d", calls.Load())
	}
}

func TestSignUpEmailTaken(t *testing.T) {
	withTempHome(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"msg":"User already registered"}`, http.StatusBadRequest)
	}))
	defer server.Close()

	_, err := SignUp(testConfig(server.URL), "john@example.com", "password123", "John Doe")
	if err != ErrEmailTaken {
		t.Fatalf("expected ErrEmailTaken, got %v", err)
	}
}

func TestSignUpWeakPassword(t *testing.T) {
	withTempHome(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"msg":"Password should be at least 8 characters"}`, http.StatusBadRequest)
	}))
	defer server.Close()

	_, err := SignUp(testConfig(server.URL), "john@example.com", "short", "John Doe")
	if err != ErrWeakPassword {
		t.Fatalf("expected ErrWeakPassword, got %v", err)
	}
}

func TestSignUpNetworkFailure(t *testing.T) {
	withTempHome(t)
	prev := authHTTPClient
	authHTTPClient = &http.Client{
		Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
			return nil, timeoutErr{}
		}),
	}
	t.Cleanup(func() { authHTTPClient = prev })

	_, err := SignUp(testConfig("http://example.com"), "john@example.com", "password123", "John Doe")
	if err != ErrNetworkFailure {
		t.Fatalf("expected ErrNetworkFailure, got %v", err)
	}
}

func TestRefreshSuccess(t *testing.T) {
	withTempHome(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("grant_type") != "refresh_token" {
			t.Fatalf("grant_type = %q", r.URL.Query().Get("grant_type"))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(authJSON("user@example.com")))
	}))
	defer server.Close()

	session, err := Refresh(testConfig(server.URL), Session{RefreshToken: "refresh"})
	if err != nil {
		t.Fatalf("Refresh: %v", err)
	}
	if session.AccessToken != "access" {
		t.Fatalf("access token = %q", session.AccessToken)
	}
}

func TestLoadStates(t *testing.T) {
	withTempHome(t)

	t.Run("no session", func(t *testing.T) {
		session, state, err := Load()
		if err != nil {
			t.Fatalf("Load: %v", err)
		}
		if state != StateUnauthenticated || session.AccessToken != "" {
			t.Fatalf("state=%v session=%+v", state, session)
		}
	})

	t.Run("expired session", func(t *testing.T) {
		if err := SaveSession(Session{AccessToken: "old", ExpiresAt: time.Now().Add(-time.Hour).Unix()}); err != nil {
			t.Fatalf("SaveSession: %v", err)
		}
		session, state, err := Load()
		if err != nil {
			t.Fatalf("Load: %v", err)
		}
		if state != StateUnauthenticated || session.AccessToken != "" {
			t.Fatalf("state=%v session=%+v", state, session)
		}
	})

	t.Run("valid session refreshes", func(t *testing.T) {
		if err := SaveSession(Session{AccessToken: "old", RefreshToken: "refresh", ExpiresAt: time.Now().Add(time.Hour).Unix()}); err != nil {
			t.Fatalf("SaveSession: %v", err)
		}
		cfg := testConfig("")
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(authJSON("user@example.com")))
		}))
		defer server.Close()
		cfg.SupabaseURL = server.URL
		writeConfig(t, cfg)

		session, state, err := Load()
		if err != nil {
			t.Fatalf("Load: %v", err)
		}
		if state != StateAuthenticated || session.AccessToken != "access" {
			t.Fatalf("state=%v session=%+v", state, session)
		}
	})
}

func TestSignOutDeletesSession(t *testing.T) {
	withTempHome(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	session := Session{AccessToken: "access", RefreshToken: "refresh", ExpiresAt: time.Now().Add(time.Hour).Unix()}
	if err := SaveSession(session); err != nil {
		t.Fatalf("SaveSession: %v", err)
	}
	if err := SignOut(testConfig(server.URL), session); err != nil {
		t.Fatalf("SignOut: %v", err)
	}
	loaded, err := LoadSession()
	if err != nil {
		t.Fatalf("LoadSession: %v", err)
	}
	if loaded.AccessToken != "" {
		t.Fatalf("expected deleted session, got %+v", loaded)
	}
}

func TestStartRefreshLoopExpiresOnFailure(t *testing.T) {
	withTempHome(t)
	cfg := testConfig("http://example.com")
	session := Session{AccessToken: "access", RefreshToken: "refresh", ExpiresAt: time.Now().Add(time.Hour).Unix()}
	if err := SaveSession(session); err != nil {
		t.Fatalf("SaveSession: %v", err)
	}

	prev := authHTTPClient
	authHTTPClient = &http.Client{
		Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
			return nil, timeoutErr{}
		}),
	}
	t.Cleanup(func() { authHTTPClient = prev })

	done := make(chan struct{})
	origAfter := refreshLoopInterval
	refreshLoopInterval = 10 * time.Millisecond
	t.Cleanup(func() { refreshLoopInterval = origAfter })

	StartRefreshLoop(cfg, session, nil, func() { close(done) })

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("refresh loop did not expire")
	}
}

func TestNetworkErrorImplementsNetError(t *testing.T) {
	var err error = timeoutErr{}
	var netErr net.Error
	if !errors.As(err, &netErr) {
		t.Fatal("timeoutErr should satisfy net.Error")
	}
}

func TestSignOutDeleteSessionRunsWithoutFile(t *testing.T) {
	withTempHome(t)
	if err := DeleteSession(); err != nil {
		t.Fatalf("DeleteSession: %v", err)
	}
}

func TestStartRefreshLoopStopsWhenSessionDeleted(t *testing.T) {
	withTempHome(t)
	cfg := testConfig("http://example.com")
	session := Session{AccessToken: "access", RefreshToken: "refresh", ExpiresAt: time.Now().Add(time.Hour).Unix()}
	if err := SaveSession(session); err != nil {
		t.Fatalf("SaveSession: %v", err)
	}
	if err := DeleteSession(); err != nil {
		t.Fatalf("DeleteSession: %v", err)
	}

	origAfter := refreshLoopInterval
	refreshLoopInterval = 10 * time.Millisecond
	t.Cleanup(func() { refreshLoopInterval = origAfter })

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	done := make(chan struct{})
	StartRefreshLoop(cfg, session, func(Session) { t.Fatal("unexpected refresh") }, func() { t.Fatal("unexpected expire") })
	go func() {
		<-ctx.Done()
		close(done)
	}()
	<-done
}

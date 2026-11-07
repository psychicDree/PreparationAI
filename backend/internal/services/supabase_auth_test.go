package services

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"preparation-ai/internal/config"
)

// fakeSupabase starts a server that answers GET /auth/v1/user with the given
// status and body, and points config.AppConfig at it.
func fakeSupabase(t *testing.T, status int, body interface{}) {
	t.Helper()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/v1/user" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer access-token" {
			t.Errorf("unexpected Authorization header %q", got)
		}
		if got := r.Header.Get("apikey"); got != "sb_publishable_test" {
			t.Errorf("unexpected apikey header %q", got)
		}
		w.WriteHeader(status)
		json.NewEncoder(w).Encode(body)
	}))
	t.Cleanup(server.Close)

	previous := config.AppConfig
	config.AppConfig = &config.Config{Supabase: config.SupabaseConfig{
		URL:            server.URL + "/", // trailing slash must be tolerated
		PublishableKey: "sb_publishable_test",
	}}
	t.Cleanup(func() { config.AppConfig = previous })
}

func TestVerifySupabaseTokenReturnsUser(t *testing.T) {
	fakeSupabase(t, http.StatusOK, map[string]interface{}{
		"id":                 "sb-user-1",
		"email":              "Ada@Example.com",
		"email_confirmed_at": "2026-11-07T00:00:00Z",
		"user_metadata":      map[string]interface{}{"full_name": "Ada Lovelace"},
		"app_metadata":       map[string]interface{}{"provider": "google"},
	})

	u, err := VerifySupabaseToken("access-token")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if u.ID != "sb-user-1" || u.Email != "ada@example.com" || u.Name != "Ada Lovelace" || u.Provider != "google" {
		t.Errorf("unexpected user %+v", u)
	}
}

func TestVerifySupabaseTokenFallsBackToEmailName(t *testing.T) {
	fakeSupabase(t, http.StatusOK, map[string]interface{}{
		"id":                 "sb-user-2",
		"email":              "grace@example.com",
		"email_confirmed_at": "2026-11-07T00:00:00Z",
	})

	u, err := VerifySupabaseToken("access-token")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if u.Name != "grace" {
		t.Errorf("Name = %q, want %q", u.Name, "grace")
	}
}

func TestVerifySupabaseTokenRejectsUnverifiedEmail(t *testing.T) {
	fakeSupabase(t, http.StatusOK, map[string]interface{}{
		"id":    "sb-user-3",
		"email": "eve@example.com",
	})

	if _, err := VerifySupabaseToken("access-token"); !errors.Is(err, ErrSupabaseEmailUnverified) {
		t.Errorf("error = %v, want ErrSupabaseEmailUnverified", err)
	}
}

func TestVerifySupabaseTokenRejectsInvalidSession(t *testing.T) {
	fakeSupabase(t, http.StatusUnauthorized, map[string]string{"msg": "invalid JWT"})

	if _, err := VerifySupabaseToken("access-token"); !errors.Is(err, ErrInvalidSupabaseSession) {
		t.Errorf("error = %v, want ErrInvalidSupabaseSession", err)
	}
}

func TestVerifySupabaseTokenRequiresConfig(t *testing.T) {
	previous := config.AppConfig
	config.AppConfig = &config.Config{}
	t.Cleanup(func() { config.AppConfig = previous })

	if _, err := VerifySupabaseToken("access-token"); !errors.Is(err, ErrSupabaseNotConfigured) {
		t.Errorf("error = %v, want ErrSupabaseNotConfigured", err)
	}
}

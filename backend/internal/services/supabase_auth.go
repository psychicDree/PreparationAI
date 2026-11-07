package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"preparation-ai/internal/config"
)

// supabaseHTTPClient is the HTTP client used to call Supabase Auth; tests may replace it.
var supabaseHTTPClient = &http.Client{Timeout: 10 * time.Second}

// ErrSupabaseNotConfigured is returned when SUPABASE_URL is not set.
var ErrSupabaseNotConfigured = errors.New("supabase auth is not configured")

// ErrInvalidSupabaseSession is returned when Supabase rejects the access token.
var ErrInvalidSupabaseSession = errors.New("invalid or expired supabase session")

// ErrSupabaseEmailUnverified is returned when the account's email isn't confirmed,
// since the email is used to link the sign-in to an existing account.
var ErrSupabaseEmailUnverified = errors.New("email address is not verified")

// SupabaseUser is the subset of a Supabase Auth user this app needs.
type SupabaseUser struct {
	ID       string
	Email    string
	Name     string
	Provider string
}

type supabaseUserResponse struct {
	ID               string                 `json:"id"`
	Email            string                 `json:"email"`
	EmailConfirmedAt *string                `json:"email_confirmed_at"`
	UserMetadata     map[string]interface{} `json:"user_metadata"`
	AppMetadata      map[string]interface{} `json:"app_metadata"`
}

// VerifySupabaseToken checks a Supabase access token by asking Supabase Auth
// for its user (GET /auth/v1/user), so it works whatever key Supabase signs
// tokens with. It requires a confirmed email.
func VerifySupabaseToken(accessToken string) (*SupabaseUser, error) {
	cfg := config.AppConfig
	if cfg == nil {
		return nil, fmt.Errorf("configuration not loaded")
	}
	baseURL := strings.TrimRight(cfg.Supabase.URL, "/")
	if baseURL == "" {
		return nil, ErrSupabaseNotConfigured
	}
	if strings.TrimSpace(accessToken) == "" {
		return nil, ErrInvalidSupabaseSession
	}

	req, err := http.NewRequest(http.MethodGet, baseURL+"/auth/v1/user", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to build supabase request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	if cfg.Supabase.PublishableKey != "" {
		req.Header.Set("apikey", cfg.Supabase.PublishableKey)
	}

	resp, err := supabaseHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to reach supabase auth: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return nil, ErrInvalidSupabaseSession
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return nil, fmt.Errorf("supabase auth returned %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var u supabaseUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&u); err != nil {
		return nil, fmt.Errorf("failed to decode supabase user: %w", err)
	}
	if u.ID == "" || u.Email == "" {
		return nil, ErrInvalidSupabaseSession
	}
	if u.EmailConfirmedAt == nil || *u.EmailConfirmedAt == "" {
		return nil, ErrSupabaseEmailUnverified
	}

	return &SupabaseUser{
		ID:       u.ID,
		Email:    strings.ToLower(strings.TrimSpace(u.Email)),
		Name:     supabaseDisplayName(u.UserMetadata, u.Email),
		Provider: metadataString(u.AppMetadata, "provider"),
	}, nil
}

// supabaseDisplayName picks the best name the provider gave, falling back to
// the part of the email before the @.
func supabaseDisplayName(meta map[string]interface{}, email string) string {
	for _, key := range []string{"full_name", "name", "user_name", "preferred_username"} {
		if v := metadataString(meta, key); v != "" {
			return v
		}
	}
	if at := strings.Index(email, "@"); at > 0 {
		return email[:at]
	}
	return email
}

func metadataString(meta map[string]interface{}, key string) string {
	if meta == nil {
		return ""
	}
	if s, ok := meta[key].(string); ok {
		return strings.TrimSpace(s)
	}
	return ""
}

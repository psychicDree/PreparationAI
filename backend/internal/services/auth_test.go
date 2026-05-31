package services

import (
	"testing"
	"time"

	"preparation-ai/internal/config"
)

func TestGenerateAndValidateJWT(t *testing.T) {
	config.AppConfig = &config.Config{
		JWT: config.JWTConfig{
			Secret:     "test-secret",
			Expiration: time.Hour,
			Issuer:     "preparation-ai-test",
		},
	}

	token, err := GenerateJWT("user-123")
	if err != nil {
		t.Fatalf("GenerateJWT returned error: %v", err)
	}
	if token == "" {
		t.Fatal("GenerateJWT returned an empty token")
	}

	claims, err := ValidateJWT(token)
	if err != nil {
		t.Fatalf("ValidateJWT returned error: %v", err)
	}
	if claims.UserID != "user-123" {
		t.Errorf("claims.UserID = %q, want %q", claims.UserID, "user-123")
	}
}

func TestValidateJWTRejectsInvalidToken(t *testing.T) {
	config.AppConfig = &config.Config{
		JWT: config.JWTConfig{Secret: "test-secret", Expiration: time.Hour, Issuer: "x"},
	}

	if _, err := ValidateJWT("not-a-real-token"); err == nil {
		t.Fatal("expected an error for an invalid token, got nil")
	}
}

func TestValidateJWTRejectsWrongSecret(t *testing.T) {
	config.AppConfig = &config.Config{
		JWT: config.JWTConfig{Secret: "secret-a", Expiration: time.Hour, Issuer: "x"},
	}
	token, err := GenerateJWT("user-1")
	if err != nil {
		t.Fatalf("GenerateJWT returned error: %v", err)
	}

	// Re-sign verification key changes: a token signed with secret-a must not
	// validate under secret-b.
	config.AppConfig.JWT.Secret = "secret-b"
	if _, err := ValidateJWT(token); err == nil {
		t.Fatal("expected validation to fail under a different secret, got nil")
	}
}

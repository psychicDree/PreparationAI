package config

import "testing"

func TestGetDatabaseDSNPrefersURL(t *testing.T) {
	c := &Config{Database: DatabaseConfig{
		URL:  "postgresql://user:pass@db.supabase.co:5432/postgres?sslmode=require",
		Host: "should-be-ignored",
	}}

	if got := c.GetDatabaseDSN(); got != c.Database.URL {
		t.Errorf("GetDatabaseDSN() = %q, want the DATABASE_URL value", got)
	}
}

func TestGetDatabaseDSNFallsBackToFields(t *testing.T) {
	c := &Config{Database: DatabaseConfig{
		Host: "h", Port: "5432", User: "u", Password: "p", Name: "db", SSLMode: "disable",
	}}

	want := "host=h port=5432 user=u password=p dbname=db sslmode=disable"
	if got := c.GetDatabaseDSN(); got != want {
		t.Errorf("GetDatabaseDSN() = %q, want %q", got, want)
	}
}

func TestValidateRequiresOpenAIKey(t *testing.T) {
	c := &Config{
		Environment: "development",
		Stripe:      StripeConfig{SecretKey: "s", PublishableKey: "p"},
	}
	if err := c.Validate(); err == nil {
		t.Fatal("expected an error when OPENAI_API_KEY is missing")
	}
}

func TestValidateRejectsDefaultJWTSecretInProduction(t *testing.T) {
	c := &Config{
		Environment: "production",
		OpenAI:      OpenAIConfig{APIKey: "k"},
		Stripe:      StripeConfig{SecretKey: "s", PublishableKey: "p"},
		JWT:         JWTConfig{Secret: "your-super-secret-jwt-key-change-in-production"},
	}
	if err := c.Validate(); err == nil {
		t.Fatal("expected an error for the default JWT secret in production")
	}
}

func TestValidatePasses(t *testing.T) {
	c := &Config{
		Environment: "development",
		OpenAI:      OpenAIConfig{APIKey: "k"},
		Stripe:      StripeConfig{SecretKey: "s", PublishableKey: "p"},
		JWT:         JWTConfig{Secret: "a-non-default-secret"},
	}
	if err := c.Validate(); err != nil {
		t.Fatalf("expected a valid config, got error: %v", err)
	}
}

package config

import "testing"

func TestValidateOpenAI(t *testing.T) {
	base := func() *Config {
		return &Config{
			JWT:         JWTConfig{Secret: "secret"},
			Stripe:      StripeConfig{SecretKey: "sk", PublishableKey: "pk"},
			Environment: "development",
		}
	}

	c := base()
	if err := c.Validate(); err == nil {
		t.Error("expected missing OPENAI_API_KEY to fail validation")
	}

	c = base()
	c.OpenAI.Mock = true
	if err := c.Validate(); err != nil {
		t.Errorf("mock mode should not require an API key: %v", err)
	}

	c = base()
	c.OpenAI.Mock = true
	c.Environment = "production"
	if err := c.Validate(); err == nil {
		t.Error("expected mock mode to be rejected in production")
	}

	c = base()
	c.OpenAI.APIKey = "key"
	if err := c.Validate(); err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	c = base()
	c.OpenAI.BaseURL = "https://api.openai.com/v1"
	if err := c.Validate(); err == nil {
		t.Error("expected hosted OpenAI without a key to fail validation")
	}

	c = base()
	c.OpenAI.BaseURL = "http://localhost:11434/v1"
	if err := c.Validate(); err != nil {
		t.Errorf("local engine should not require an API key: %v", err)
	}
}

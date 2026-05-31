package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all configuration for our application
type Config struct {
	// Server configuration
	Server ServerConfig `json:"server"`

	// Database configuration
	Database DatabaseConfig `json:"database"`

	// Redis configuration
	Redis RedisConfig `json:"redis"`

	// JWT configuration
	JWT JWTConfig `json:"jwt"`

	// External services
	OpenAI OpenAIConfig `json:"openai"`
	Stripe StripeConfig `json:"stripe"`

	// Environment
	Environment string `json:"environment"`
}

type ServerConfig struct {
	Port           string        `json:"port"`
	Host           string        `json:"host"`
	ReadTimeout    time.Duration `json:"read_timeout"`
	WriteTimeout   time.Duration `json:"write_timeout"`
	IdleTimeout    time.Duration `json:"idle_timeout"`
	AllowedOrigins string        `json:"allowed_origins"`
}

type DatabaseConfig struct {
	// URL, when set, is a full Postgres connection string (e.g. the one
	// Supabase provides) and takes precedence over the discrete fields below.
	URL      string `json:"url"`
	Host     string `json:"host"`
	Port     string `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	Name     string `json:"name"`
	SSLMode  string `json:"ssl_mode"`
	MaxConns int    `json:"max_connections"`
	MinConns int    `json:"min_connections"`
}

type RedisConfig struct {
	Host     string `json:"host"`
	Port     string `json:"port"`
	Password string `json:"password"`
	DB       int    `json:"db"`
}

type JWTConfig struct {
	Secret     string        `json:"secret"`
	Expiration time.Duration `json:"expiration"`
	Issuer     string        `json:"issuer"`
}

type OpenAIConfig struct {
	APIKey    string `json:"api_key"`
	Model     string `json:"model"`
	MaxTokens int    `json:"max_tokens"`
}

type StripeConfig struct {
	SecretKey      string `json:"secret_key"`
	PublishableKey string `json:"publishable_key"`
	WebhookSecret  string `json:"webhook_secret"`
}

var AppConfig *Config

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		// .env file is optional, so we don't return an error
		fmt.Println("No .env file found, using system environment variables")
	}

	config := &Config{
		Server: ServerConfig{
			Port:           getEnv("PORT", "8080"),
			Host:           getEnv("SERVER_HOST", "0.0.0.0"),
			ReadTimeout:    getDurationEnv("SERVER_READ_TIMEOUT", 30*time.Second),
			WriteTimeout:   getDurationEnv("SERVER_WRITE_TIMEOUT", 30*time.Second),
			IdleTimeout:    getDurationEnv("SERVER_IDLE_TIMEOUT", 120*time.Second),
			AllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"),
		},
		Database: DatabaseConfig{
			URL:      getEnv("DATABASE_URL", ""),
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "password"),
			Name:     getEnv("DB_NAME", "preparation_ai"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
			MaxConns: getIntEnv("DB_MAX_CONNECTIONS", 25),
			MinConns: getIntEnv("DB_MIN_CONNECTIONS", 5),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getIntEnv("REDIS_DB", 0),
		},
		JWT: JWTConfig{
			Secret:     getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production"),
			Expiration: getDurationEnv("JWT_EXPIRATION", 24*time.Hour),
			Issuer:     getEnv("JWT_ISSUER", "preparation-ai"),
		},
		OpenAI: OpenAIConfig{
			APIKey:    getEnv("OPENAI_API_KEY", ""),
			Model:     getEnv("OPENAI_MODEL", "gpt-4o"),
			MaxTokens: getIntEnv("OPENAI_MAX_TOKENS", 1000),
		},
		Stripe: StripeConfig{
			SecretKey:      getEnv("STRIPE_SECRET_KEY", ""),
			PublishableKey: getEnv("STRIPE_PUBLISHABLE_KEY", ""),
			WebhookSecret:  getEnv("STRIPE_WEBHOOK_SECRET", ""),
		},
		Environment: getEnv("NODE_ENV", "development"),
	}

	// Validate required configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("configuration validation failed: %w", err)
	}

	AppConfig = config
	return config, nil
}

// Validate checks if all required configuration is present
func (c *Config) Validate() error {
	// Validate JWT secret
	if c.JWT.Secret == "your-super-secret-jwt-key-change-in-production" && c.Environment == "production" {
		return fmt.Errorf("JWT_SECRET must be set to a secure value in production")
	}

	// Validate OpenAI API key
	if c.OpenAI.APIKey == "" {
		return fmt.Errorf("OPENAI_API_KEY is required")
	}

	// Validate Stripe keys
	if c.Stripe.SecretKey == "" {
		return fmt.Errorf("STRIPE_SECRET_KEY is required")
	}

	if c.Stripe.PublishableKey == "" {
		return fmt.Errorf("STRIPE_PUBLISHABLE_KEY is required")
	}

	return nil
}

// GetDatabaseDSN returns the database connection string. When DATABASE_URL is
// set (e.g. the Supabase connection string) it is used directly; otherwise the
// DSN is assembled from the discrete DB_* fields.
func (c *Config) GetDatabaseDSN() string {
	if c.Database.URL != "" {
		return c.Database.URL
	}
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host,
		c.Database.Port,
		c.Database.User,
		c.Database.Password,
		c.Database.Name,
		c.Database.SSLMode,
	)
}

// GetRedisURL returns the Redis connection URL
func (c *Config) GetRedisURL() string {
	if c.Redis.Password != "" {
		return fmt.Sprintf("redis://:%s@%s:%s/%d",
			c.Redis.Password,
			c.Redis.Host,
			c.Redis.Port,
			c.Redis.DB,
		)
	}
	return fmt.Sprintf("redis://%s:%s/%d",
		c.Redis.Host,
		c.Redis.Port,
		c.Redis.DB,
	)
}

// IsDevelopment returns true if running in development mode
func (c *Config) IsDevelopment() bool {
	return c.Environment == "development"
}

// IsProduction returns true if running in production mode
func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

// Helper functions for environment variable parsing

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getBoolEnv(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

package services

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"preparation-ai/internal/config"
	"preparation-ai/internal/database"
)

type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

func GenerateJWT(userID string) (string, error) {
	cfg := config.AppConfig
	if cfg == nil {
		return "", errors.New("configuration not loaded")
	}

	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(cfg.JWT.Expiration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    cfg.JWT.Issuer,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWT.Secret))
}

func ValidateJWT(tokenString string) (*Claims, error) {
	cfg := config.AppConfig
	if cfg == nil {
		return nil, errors.New("configuration not loaded")
	}

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(cfg.JWT.Secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// BlacklistToken adds a token to the blacklist
func BlacklistToken(tokenString string) error {
	// Parse the token to get expiration time
	claims, err := ValidateJWT(tokenString)
	if err != nil {
		// If token is invalid, we still want to blacklist it
		// to prevent any potential security issues
		claims = &Claims{
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			},
		}
	}

	// Store the token in the blacklist table
	query := `
		INSERT INTO token_blacklist (token, expires_at, created_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (token) DO NOTHING
	`

	_, err = database.DB.Exec(query, tokenString, claims.ExpiresAt.Time, time.Now())
	if err != nil {
		return err
	}

	return nil
}

// IsTokenBlacklisted checks if a token is in the blacklist
func IsTokenBlacklisted(tokenString string) (bool, error) {
	query := `
		SELECT COUNT(*) FROM token_blacklist 
		WHERE token = $1 AND expires_at > NOW()
	`

	var count int
	err := database.DB.QueryRow(query, tokenString).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

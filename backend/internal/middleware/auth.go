package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	jwtware "github.com/gofiber/jwt/v3"
	"github.com/golang-jwt/jwt/v4"
	"preparation-ai/internal/config"
	"preparation-ai/internal/services"
)

func Protected() fiber.Handler {
	cfg := config.AppConfig
	if cfg == nil {
		// Fallback to default secret if config not loaded
		return jwtware.New(jwtware.Config{
			SigningKey: []byte("your-secret-key"),
			ErrorHandler: func(c *fiber.Ctx, err error) error {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Unauthorized",
				})
			},
		})
	}

	return jwtware.New(jwtware.Config{
		SigningKey: []byte(cfg.JWT.Secret),
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		},
		SuccessHandler: func(c *fiber.Ctx) error {
			// Extract token from Authorization header
			tokenString := GetBearerToken(c)
			if tokenString == "" {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "No token provided",
				})
			}

			// Check if token is blacklisted
			isBlacklisted, err := services.IsTokenBlacklisted(tokenString)
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Internal server error",
				})
			}

			if isBlacklisted {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Token has been revoked",
				})
			}

			// Extract user ID from JWT token and store in locals
			token := c.Locals("user").(*jwt.Token)
			claims := token.Claims.(jwt.MapClaims)
			userID, ok := claims["user_id"].(string)
			if !ok {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Invalid token claims",
				})
			}
			c.Locals("userID", userID)
			return c.Next()
		},
	})
}

func ExtractUserID(c *fiber.Ctx) string {
	user := c.Locals("user")
	if user == nil {
		return ""
	}
	
	// Extract user ID from JWT claims
	// This is a simplified version - in production, you'd parse the JWT properly
	return "user-id-placeholder"
}

func GetBearerToken(c *fiber.Ctx) string {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return ""
	}
	
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return ""
	}
	
	return parts[1]
}

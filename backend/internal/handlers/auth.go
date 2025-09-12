package handlers

import (
	"preparation-ai/internal/models"
	"preparation-ai/internal/services"

	"github.com/gofiber/fiber/v2"
)

func Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Create user in database
	user, err := services.CreateUser(req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create user: " + err.Error(),
		})
	}

	token, err := services.GenerateJWT(user.ID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to generate token",
		})
	}

	return c.JSON(models.AuthResponse{
		Token: token,
		User:  *user,
	})
}

func Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Get user from database
	user, err := services.GetUserByEmail(req.Email)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	// Validate password
	err = services.ValidatePassword(user.Password, req.Password)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	// Clear password from response
	user.Password = ""

	token, err := services.GenerateJWT(user.ID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to generate token",
		})
	}

	return c.JSON(models.AuthResponse{
		Token: token,
		User:  *user,
	})
}

func Logout(c *fiber.Ctx) error {
	// Get the token from the request
	token := c.Get("Authorization")
	if token == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "No token provided",
		})
	}

	// Remove "Bearer " prefix if present
	if len(token) > 7 && token[:7] == "Bearer " {
		token = token[7:]
	}

	// Add token to blacklist (invalidate it)
	err := services.BlacklistToken(token)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to logout",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Logged out successfully",
	})
}

func GetProfile(c *fiber.Ctx) error {
	// Get user ID from JWT (from middleware)
	userID := c.Locals("userID").(string)

	// Get user from database
	user, err := services.GetUserByID(userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	return c.JSON(user)
}

func UpdateProfile(c *fiber.Ctx) error {
	// Get user ID from JWT (from middleware)
	userID := c.Locals("userID").(string)

	var req models.UserProfile
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update user profile in database
	updates := make(map[string]interface{})
	if req.Experience != 0 {
		updates["experience"] = req.Experience
	}
	if req.Skills != nil {
		updates["skills"] = req.Skills
	}
	if req.Preferences != "" {
		updates["preferences"] = req.Preferences
	}

	user, err := services.UpdateUser(userID, updates)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to update profile: " + err.Error(),
		})
	}

	return c.JSON(user)
}

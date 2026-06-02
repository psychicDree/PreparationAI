package handlers

import (
	"preparation-ai/internal/services"

	"github.com/gofiber/fiber/v2"
)

func CreatePaymentIntent(c *fiber.Ctx) error {
	// TODO: Get user ID from JWT
	userID := "user-id-placeholder"

	var req struct {
		SessionType string `json:"session_type"`
		SessionID   string `json:"session_id"`
		Amount      int64  `json:"amount"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	clientSecret, err := services.CreatePaymentIntent(userID, req.Amount, req.SessionType, req.SessionID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create payment intent",
		})
	}

	return c.JSON(fiber.Map{
		"client_secret": clientSecret,
	})
}

func ConfirmPayment(c *fiber.Ctx) error {
	var req struct {
		PaymentIntentID string `json:"payment_intent_id"`
		SessionID       string `json:"session_id"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}
	if req.PaymentIntentID == "" || req.SessionID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "payment_intent_id and session_id are required",
		})
	}

	err := services.ConfirmPayment(req.PaymentIntentID, req.SessionID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to confirm payment",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Payment confirmed successfully",
	})
}

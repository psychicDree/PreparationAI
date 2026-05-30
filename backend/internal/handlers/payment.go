package handlers

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/webhook"
	"preparation-ai/internal/config"
	"preparation-ai/internal/services"
)

func CreatePaymentIntent(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req struct {
		SessionID   string `json:"session_id"`
		SessionType string `json:"session_type"`
		Amount      int64  `json:"amount"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	clientSecret, err := services.CreatePaymentIntent(userID, req.SessionID, req.Amount, req.SessionType)
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

	// ConfirmPayment verifies the PaymentIntent with Stripe before activating
	// the session, so a client cannot mark itself paid.
	if err := services.ConfirmPayment(req.PaymentIntentID, req.SessionID); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Failed to confirm payment: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Payment confirmed successfully",
	})
}

// StripeWebhook handles Stripe event callbacks. It verifies the signature
// against the configured webhook secret and reconciles session state on
// payment_intent.succeeded. This is the authoritative source of payment truth.
func StripeWebhook(c *fiber.Ctx) error {
	cfg := config.AppConfig
	if cfg == nil || cfg.Stripe.WebhookSecret == "" {
		return c.Status(500).JSON(fiber.Map{"error": "Webhook not configured"})
	}

	event, err := webhook.ConstructEvent(c.Body(), c.Get("Stripe-Signature"), cfg.Stripe.WebhookSecret)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid signature"})
	}

	if event.Type == "payment_intent.succeeded" {
		var pi stripe.PaymentIntent
		if err := json.Unmarshal(event.Data.Raw, &pi); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid payload"})
		}
		if sessionID := pi.Metadata["session_id"]; sessionID != "" {
			if err := services.MarkSessionPaid(sessionID, pi.ID); err != nil {
				// Returning 500 lets Stripe retry the delivery.
				return c.Status(500).JSON(fiber.Map{"error": "Failed to update session"})
			}
		}
	}

	return c.JSON(fiber.Map{"received": true})
}

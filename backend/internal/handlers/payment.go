package handlers

import (
	"encoding/json"
	"errors"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/webhook"
	"preparation-ai/internal/config"
	"preparation-ai/internal/services"
)

// CreatePaymentIntent starts a payment for one of the caller's sessions. The
// amount comes from the session's type on the server; any client-supplied
// amount or session type is ignored.
func CreatePaymentIntent(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req struct {
		SessionID string `json:"session_id"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}
	if req.SessionID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "session_id is required",
		})
	}

	session, err := services.GetSessionByID(req.SessionID, userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Session not found",
		})
	}
	if session.PaymentIntentID != "" {
		return c.Status(409).JSON(fiber.Map{
			"error": "Session is already paid",
		})
	}

	sessionType := string(session.SessionType)
	amount := services.GetSessionPricing(sessionType)

	clientSecret, err := services.CreatePaymentIntent(userID, session.ID, amount, sessionType)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create payment intent",
		})
	}

	return c.JSON(fiber.Map{
		"client_secret": clientSecret,
		"amount":        amount,
	})
}

func ConfirmPayment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

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

	if _, err := services.GetSessionByID(req.SessionID, userID); err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Session not found",
		})
	}

	// ConfirmPayment verifies the PaymentIntent with Stripe, and that it was
	// created for this session and user, before activating the session, so a
	// client cannot mark itself paid.
	if err := services.ConfirmPayment(req.PaymentIntentID, req.SessionID, userID); err != nil {
		if errors.Is(err, services.ErrSessionAlreadyPaid) {
			return c.Status(409).JSON(fiber.Map{
				"error": "Session is already paid with a different payment",
			})
		}
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
				if errors.Is(err, services.ErrSessionAlreadyPaid) {
					// A second successful payment for an already-paid session:
					// retrying will not change that, so acknowledge it and leave
					// the duplicate for a refund.
					log.Printf("stripe webhook: session %s already paid; duplicate payment %s needs a refund", sessionID, pi.ID)
					return c.JSON(fiber.Map{"received": true})
				}
				// Returning 500 lets Stripe retry the delivery.
				return c.Status(500).JSON(fiber.Map{"error": "Failed to update session"})
			}
		}
	}

	return c.JSON(fiber.Map{"received": true})
}

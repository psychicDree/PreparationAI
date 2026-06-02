package services

import (
	"fmt"
	"strings"

	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/paymentintent"
	"preparation-ai/internal/config"
	"preparation-ai/internal/database"
)

func CreatePaymentIntent(userID string, amount int64, sessionType string, sessionID string) (string, error) {
	cfg := config.AppConfig
	if cfg == nil {
		return "", fmt.Errorf("configuration not loaded")
	}

	stripe.Key = cfg.Stripe.SecretKey

	metadata := map[string]string{
		"user_id":      userID,
		"session_type": sessionType,
	}
	if strings.TrimSpace(sessionID) != "" {
		metadata["session_id"] = sessionID
	}

	params := &stripe.PaymentIntentParams{
		Amount:   stripe.Int64(amount),
		Currency: stripe.String("usd"),
		Params: stripe.Params{
			Metadata: metadata,
		},
	}

	pi, err := paymentintent.New(params)
	if err != nil {
		return "", fmt.Errorf("failed to create payment intent: %w", err)
	}

	return pi.ClientSecret, nil
}

func ConfirmPayment(paymentIntentID string, sessionID string) error {
	if strings.TrimSpace(paymentIntentID) == "" {
		return fmt.Errorf("payment intent id is required")
	}
	if strings.TrimSpace(sessionID) == "" {
		return fmt.Errorf("session id is required")
	}
	cfg := config.AppConfig
	if cfg == nil {
		return fmt.Errorf("configuration not loaded")
	}
	if database.DB == nil {
		return fmt.Errorf("database not connected")
	}

	stripe.Key = cfg.Stripe.SecretKey

	pi, err := paymentintent.Get(paymentIntentID, nil)
	if err != nil {
		return fmt.Errorf("failed to retrieve payment intent: %w", err)
	}
	if pi.Status != stripe.PaymentIntentStatusSucceeded {
		return fmt.Errorf("payment intent %s is not succeeded: %s", paymentIntentID, pi.Status)
	}
	if metadataSessionID := strings.TrimSpace(pi.Metadata["session_id"]); metadataSessionID != "" && metadataSessionID != sessionID {
		return fmt.Errorf("payment intent session mismatch")
	}

	result, err := database.DB.Exec(`
		UPDATE interview_sessions
		SET payment_intent_id = $1, updated_at = NOW()
		WHERE id = $2 AND (payment_intent_id IS NULL OR payment_intent_id = $1)
	`, paymentIntentID, sessionID)
	if err != nil {
		return fmt.Errorf("failed to attach payment intent to session: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to read session update result: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("session not found or already linked to another payment intent")
	}

	return nil
}

func GetSessionPricing(sessionType string) int64 {
	switch sessionType {
	case "quick_drill":
		return 500 // $5.00 in cents
	case "standard":
		return 900 // $9.00 in cents
	case "deep_dive":
		return 1500 // $15.00 in cents
	default:
		return 900
	}
}

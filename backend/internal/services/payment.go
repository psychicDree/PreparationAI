package services

import (
	"fmt"

	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/paymentintent"
	"preparation-ai/internal/config"
)

func CreatePaymentIntent(userID string, amount int64, sessionType string) (string, error) {
	cfg := config.AppConfig
	if cfg == nil {
		return "", fmt.Errorf("configuration not loaded")
	}

	stripe.Key = cfg.Stripe.SecretKey

	params := &stripe.PaymentIntentParams{
		Amount:   stripe.Int64(amount),
		Currency: stripe.String("usd"),
		Params: stripe.Params{
			Metadata: map[string]string{
				"user_id":      userID,
				"session_type": sessionType,
			},
		},
	}

	pi, err := paymentintent.New(params)
	if err != nil {
		return "", fmt.Errorf("failed to create payment intent: %w", err)
	}

	return pi.ClientSecret, nil
}

func ConfirmPayment(paymentIntentID string, sessionID string) error {
	cfg := config.AppConfig
	if cfg == nil {
		return fmt.Errorf("configuration not loaded")
	}

	stripe.Key = cfg.Stripe.SecretKey

	// TODO: Retrieve and confirm payment intent
	// TODO: Update session status in database
	
	_ = paymentIntentID
	_ = sessionID

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

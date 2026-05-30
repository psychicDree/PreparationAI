package services

import (
	"fmt"

	"github.com/stripe/stripe-go/v72"
	"github.com/stripe/stripe-go/v72/paymentintent"
	"preparation-ai/internal/config"
)

// CreatePaymentIntent creates a Stripe PaymentIntent for a session and returns
// the client secret. The user and session are recorded in metadata so the
// webhook/confirmation step can attribute the payment.
func CreatePaymentIntent(userID, sessionID string, amount int64, sessionType string) (string, error) {
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
				"session_id":   sessionID,
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

// ConfirmPayment verifies a PaymentIntent has succeeded with Stripe and, if so,
// marks the associated session as paid. It returns an error if the payment has
// not actually succeeded, so the caller must not activate the session on a
// client claim alone.
func ConfirmPayment(paymentIntentID string, sessionID string) error {
	cfg := config.AppConfig
	if cfg == nil {
		return fmt.Errorf("configuration not loaded")
	}

	stripe.Key = cfg.Stripe.SecretKey

	pi, err := paymentintent.Get(paymentIntentID, nil)
	if err != nil {
		return fmt.Errorf("failed to retrieve payment intent: %w", err)
	}

	if pi.Status != stripe.PaymentIntentStatusSucceeded {
		return fmt.Errorf("payment not completed: status %s", pi.Status)
	}

	return MarkSessionPaid(sessionID, paymentIntentID)
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

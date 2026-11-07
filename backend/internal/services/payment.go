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
// not actually succeeded, or was created for a different session or user, so
// the caller must not activate the session on a client claim alone.
func ConfirmPayment(paymentIntentID, sessionID, userID, sessionType string) error {
	cfg := config.AppConfig
	if cfg == nil {
		return fmt.Errorf("configuration not loaded")
	}

	stripe.Key = cfg.Stripe.SecretKey

	pi, err := paymentintent.Get(paymentIntentID, nil)
	if err != nil {
		return fmt.Errorf("failed to retrieve payment intent: %w", err)
	}

	if err := verifyPaymentIntent(pi, sessionID, userID, GetSessionPricing(sessionType)); err != nil {
		return err
	}

	return MarkSessionPaid(sessionID, paymentIntentID)
}

// verifyPaymentIntent checks that a PaymentIntent has succeeded, was created
// by CreatePaymentIntent for this session and user, and paid the price of the
// session's current type. Only this server can set PaymentIntent metadata (it
// needs the Stripe secret key), so the metadata binding stops one payment from
// being reused to mark other sessions paid; the amount check stops a cheaper
// payment being used after the session type was changed to a dearer one.
func verifyPaymentIntent(pi *stripe.PaymentIntent, sessionID, userID string, expectedAmount int64) error {
	if pi.Status != stripe.PaymentIntentStatusSucceeded {
		return fmt.Errorf("payment not completed: status %s", pi.Status)
	}
	if err := verifyPaymentAmount(pi, expectedAmount); err != nil {
		return err
	}
	if pi.Metadata["session_id"] == "" || pi.Metadata["session_id"] != sessionID {
		return fmt.Errorf("payment intent does not belong to this session")
	}
	if pi.Metadata["user_id"] == "" || pi.Metadata["user_id"] != userID {
		return fmt.Errorf("payment intent does not belong to this user")
	}
	return nil
}

// verifyPaymentAmount checks a PaymentIntent paid exactly the expected amount in USD.
func verifyPaymentAmount(pi *stripe.PaymentIntent, expectedAmount int64) error {
	if pi.Currency != string(stripe.CurrencyUSD) || pi.Amount != expectedAmount {
		return fmt.Errorf("payment amount %d %s does not match the session price %d usd", pi.Amount, pi.Currency, expectedAmount)
	}
	return nil
}

// VerifyWebhookPayment checks a PaymentIntent from a signed webhook paid the
// current price of its session's type.
func VerifyWebhookPayment(pi *stripe.PaymentIntent, sessionType string) error {
	return verifyPaymentAmount(pi, GetSessionPricing(sessionType))
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

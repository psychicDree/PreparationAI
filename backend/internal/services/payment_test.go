package services

import (
	"testing"

	"github.com/stripe/stripe-go/v72"
)

func TestGetSessionPricing(t *testing.T) {
	cases := map[string]int64{
		"quick_drill": 500,
		"standard":    900,
		"deep_dive":   1500,
		"unknown":     900, // defaults to standard pricing
	}

	for input, want := range cases {
		if got := GetSessionPricing(input); got != want {
			t.Errorf("GetSessionPricing(%q) = %d, want %d", input, got, want)
		}
	}
}

func TestVerifyPaymentIntent(t *testing.T) {
	// A standard session costs 900 cents.
	paid := func(meta map[string]string) *stripe.PaymentIntent {
		return &stripe.PaymentIntent{Status: stripe.PaymentIntentStatusSucceeded, Amount: 900, Currency: "usd", Metadata: meta}
	}
	own := map[string]string{"session_id": "s1", "user_id": "u1"}

	cases := []struct {
		name    string
		pi      *stripe.PaymentIntent
		wantErr bool
	}{
		{"succeeded for this session and user", paid(own), false},
		{"not succeeded", &stripe.PaymentIntent{Status: stripe.PaymentIntentStatusRequiresPaymentMethod, Amount: 900, Currency: "usd", Metadata: own}, true},
		{"paid less than the session price", &stripe.PaymentIntent{Status: stripe.PaymentIntentStatusSucceeded, Amount: 500, Currency: "usd", Metadata: own}, true},
		{"paid in another currency", &stripe.PaymentIntent{Status: stripe.PaymentIntentStatusSucceeded, Amount: 900, Currency: "eur", Metadata: own}, true},
		{"paid for another session", paid(map[string]string{"session_id": "s2", "user_id": "u1"}), true},
		{"paid by another user", paid(map[string]string{"session_id": "s1", "user_id": "u2"}), true},
		{"no session metadata", paid(map[string]string{"user_id": "u1"}), true},
		{"no user metadata", paid(map[string]string{"session_id": "s1"}), true},
		{"no metadata", paid(nil), true},
	}

	for _, tc := range cases {
		err := verifyPaymentIntent(tc.pi, "s1", "u1", GetSessionPricing("standard"))
		if (err != nil) != tc.wantErr {
			t.Errorf("%s: verifyPaymentIntent() error = %v, wantErr %v", tc.name, err, tc.wantErr)
		}
	}
}

func TestVerifyWebhookPaymentMatchesSessionType(t *testing.T) {
	pi := &stripe.PaymentIntent{Amount: 500, Currency: "usd"}
	if err := VerifyWebhookPayment(pi, "quick_drill"); err != nil {
		t.Errorf("quick_drill paid 500: unexpected error %v", err)
	}
	if err := VerifyWebhookPayment(pi, "deep_dive"); err == nil {
		t.Error("deep_dive paid only 500: expected an error")
	}
}

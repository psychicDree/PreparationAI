package services

import "testing"

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

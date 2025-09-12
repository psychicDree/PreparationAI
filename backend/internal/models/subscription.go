package models

import (
	"time"
)

// SubscriptionPlan represents a subscription plan
type SubscriptionPlan struct {
	ID                    string                 `json:"id" db:"id"`
	Name                  string                 `json:"name" db:"name"`
	Description           string                 `json:"description" db:"description"`
	PriceMonthly          float64                `json:"price_monthly" db:"price_monthly"`
	PriceYearly           float64                `json:"price_yearly" db:"price_yearly"`
	Features              map[string]interface{} `json:"features" db:"features"`
	MaxSessionsPerMonth   int                    `json:"max_sessions_per_month" db:"max_sessions_per_month"`
	MaxSessionDuration    int                    `json:"max_session_duration" db:"max_session_duration"` // in minutes
	IsActive              bool                   `json:"is_active" db:"is_active"`
	StripePriceIDMonthly  string                 `json:"stripe_price_id_monthly" db:"stripe_price_id_monthly"`
	StripePriceIDYearly   string                 `json:"stripe_price_id_yearly" db:"stripe_price_id_yearly"`
	CreatedAt             time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time              `json:"updated_at" db:"updated_at"`
}

// UserSubscription represents a user's subscription
type UserSubscription struct {
	ID                    string    `json:"id" db:"id"`
	UserID                string    `json:"user_id" db:"user_id"`
	PlanID                string    `json:"plan_id" db:"plan_id"`
	Status                string    `json:"status" db:"status"`
	BillingCycle          string    `json:"billing_cycle" db:"billing_cycle"`
	StripeSubscriptionID  string    `json:"stripe_subscription_id" db:"stripe_subscription_id"`
	CurrentPeriodStart    time.Time `json:"current_period_start" db:"current_period_start"`
	CurrentPeriodEnd      time.Time `json:"current_period_end" db:"current_period_end"`
	CreatedAt             time.Time `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time `json:"updated_at" db:"updated_at"`
	
	// Joined data
	Plan *SubscriptionPlan `json:"plan,omitempty"`
}

// SubscriptionWithPlan represents a user subscription with plan details
type SubscriptionWithPlan struct {
	UserSubscription
	Plan SubscriptionPlan `json:"plan"`
}

// CreateSubscriptionRequest represents the request to create a subscription
type CreateSubscriptionRequest struct {
	PlanID       string `json:"plan_id" validate:"required"`
	BillingCycle string `json:"billing_cycle" validate:"required,oneof=monthly yearly"`
}

// UpdateSubscriptionRequest represents the request to update a subscription
type UpdateSubscriptionRequest struct {
	Status       string `json:"status,omitempty"`
	BillingCycle string `json:"billing_cycle,omitempty"`
}

// SubscriptionUsage represents current usage statistics
type SubscriptionUsage struct {
	SessionsUsedThisMonth int       `json:"sessions_used_this_month"`
	MaxSessionsPerMonth   int       `json:"max_sessions_per_month"`
	CurrentPlan           string    `json:"current_plan"`
	Status                string    `json:"status"`
	ExpiresAt             time.Time `json:"expires_at"`
}

package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"preparation-ai/internal/database"
	"preparation-ai/internal/models"
)

// GetSubscriptionPlans retrieves all active subscription plans
func GetSubscriptionPlans() ([]models.SubscriptionPlan, error) {
	query := `
		SELECT id, name, description, price_monthly, price_yearly, features, 
		       max_sessions_per_month, max_session_duration, is_active,
		       stripe_price_id_monthly, stripe_price_id_yearly, created_at, updated_at
		FROM subscription_plans 
		WHERE is_active = true 
		ORDER BY price_monthly ASC
	`

	log.Printf("Executing query: %s", query)
	rows, err := database.DB.Query(query)
	if err != nil {
		log.Printf("Database query error: %v", err)
		return nil, fmt.Errorf("failed to query subscription plans: %w", err)
	}
	defer rows.Close()

	var plans []models.SubscriptionPlan
	for rows.Next() {
		var plan models.SubscriptionPlan
		var featuresJSON []byte
		var stripePriceIDMonthly, stripePriceIDYearly sql.NullString

		err := rows.Scan(
			&plan.ID, &plan.Name, &plan.Description, &plan.PriceMonthly, &plan.PriceYearly,
			&featuresJSON, &plan.MaxSessionsPerMonth, &plan.MaxSessionDuration, &plan.IsActive,
			&stripePriceIDMonthly, &stripePriceIDYearly, &plan.CreatedAt, &plan.UpdatedAt,
		)
		if err != nil {
			log.Printf("Row scan error: %v", err)
			return nil, fmt.Errorf("failed to scan subscription plan: %w", err)
		}

		// Parse JSONB features
		if err := json.Unmarshal(featuresJSON, &plan.Features); err != nil {
			log.Printf("JSON unmarshal error: %v, featuresJSON: %s", err, string(featuresJSON))
			return nil, fmt.Errorf("failed to parse features JSON: %w", err)
		}

		// Handle nullable Stripe price IDs
		if stripePriceIDMonthly.Valid {
			plan.StripePriceIDMonthly = stripePriceIDMonthly.String
		}
		if stripePriceIDYearly.Valid {
			plan.StripePriceIDYearly = stripePriceIDYearly.String
		}

		plans = append(plans, plan)
	}

	return plans, nil
}

// GetSubscriptionPlanByID retrieves a specific subscription plan
func GetSubscriptionPlanByID(planID string) (*models.SubscriptionPlan, error) {
	query := `
		SELECT id, name, description, price_monthly, price_yearly, features, 
		       max_sessions_per_month, max_session_duration, is_active,
		       stripe_price_id_monthly, stripe_price_id_yearly, created_at, updated_at
		FROM subscription_plans 
		WHERE id = $1 AND is_active = true
	`

	var plan models.SubscriptionPlan
	var featuresJSON []byte
	var stripePriceIDMonthly, stripePriceIDYearly sql.NullString

	err := database.DB.QueryRow(query, planID).Scan(
		&plan.ID, &plan.Name, &plan.Description, &plan.PriceMonthly, &plan.PriceYearly,
		&featuresJSON, &plan.MaxSessionsPerMonth, &plan.MaxSessionDuration, &plan.IsActive,
		&stripePriceIDMonthly, &stripePriceIDYearly, &plan.CreatedAt, &plan.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("subscription plan not found")
		}
		return nil, fmt.Errorf("failed to get subscription plan: %w", err)
	}

	// Parse JSONB features
	if err := json.Unmarshal(featuresJSON, &plan.Features); err != nil {
		return nil, fmt.Errorf("failed to parse features JSON: %w", err)
	}

	// Handle nullable Stripe price IDs
	if stripePriceIDMonthly.Valid {
		plan.StripePriceIDMonthly = stripePriceIDMonthly.String
	}
	if stripePriceIDYearly.Valid {
		plan.StripePriceIDYearly = stripePriceIDYearly.String
	}

	return &plan, nil
}

// GetUserSubscription retrieves a user's current active subscription
func GetUserSubscription(userID string) (*models.SubscriptionWithPlan, error) {
	query := `
		SELECT 
			us.id, us.user_id, us.plan_id, us.status, us.billing_cycle,
			us.stripe_subscription_id, us.current_period_start, us.current_period_end,
			us.created_at, us.updated_at,
			sp.id, sp.name, sp.description, sp.price_monthly, sp.price_yearly, sp.features,
			sp.max_sessions_per_month, sp.max_session_duration, sp.is_active,
			sp.stripe_price_id_monthly, sp.stripe_price_id_yearly, sp.created_at, sp.updated_at
		FROM user_subscriptions us
		JOIN subscription_plans sp ON us.plan_id = sp.id
		WHERE us.user_id = $1 AND us.status = 'active'
		ORDER BY us.created_at DESC
		LIMIT 1
	`

	var subscription models.SubscriptionWithPlan
	var plan models.SubscriptionPlan
	var featuresJSON []byte
	var stripePriceIDMonthly, stripePriceIDYearly sql.NullString

	err := database.DB.QueryRow(query, userID).Scan(
		&subscription.ID, &subscription.UserID, &subscription.PlanID, &subscription.Status,
		&subscription.BillingCycle, &subscription.StripeSubscriptionID,
		&subscription.CurrentPeriodStart, &subscription.CurrentPeriodEnd,
		&subscription.CreatedAt, &subscription.UpdatedAt,
		&plan.ID, &plan.Name, &plan.Description, &plan.PriceMonthly, &plan.PriceYearly,
		&featuresJSON, &plan.MaxSessionsPerMonth, &plan.MaxSessionDuration, &plan.IsActive,
		&stripePriceIDMonthly, &stripePriceIDYearly, &plan.CreatedAt, &plan.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			// Create a free subscription for the user if they don't have one
			return createDefaultFreeSubscription(userID)
		}
		return nil, fmt.Errorf("failed to get user subscription: %w", err)
	}

	// Parse JSONB features
	if err := json.Unmarshal(featuresJSON, &plan.Features); err != nil {
		return nil, fmt.Errorf("failed to parse features JSON: %w", err)
	}

	// Handle nullable Stripe price IDs
	if stripePriceIDMonthly.Valid {
		plan.StripePriceIDMonthly = stripePriceIDMonthly.String
	}
	if stripePriceIDYearly.Valid {
		plan.StripePriceIDYearly = stripePriceIDYearly.String
	}

	subscription.Plan = plan
	return &subscription, nil
}

// createDefaultFreeSubscription creates a free subscription for a user in the database
func createDefaultFreeSubscription(userID string) (*models.SubscriptionWithPlan, error) {
	// Get the free plan
	freePlan, err := GetSubscriptionPlanByID("00000000-0000-0000-0000-000000000001")
	if err != nil {
		return nil, fmt.Errorf("failed to get free plan: %w", err)
	}

	// Create the subscription in the database
	subscriptionID := uuid.New().String()
	now := time.Now()
	periodEnd := now.AddDate(0, 1, 0) // 1 month from now

	query := `
		INSERT INTO user_subscriptions (id, user_id, plan_id, status, billing_cycle, 
		                               current_period_start, current_period_end)
		VALUES ($1, $2, $3, 'active', 'monthly', $4, $5)
	`

	_, err = database.DB.Exec(query, subscriptionID, userID, freePlan.ID, now, periodEnd)
	if err != nil {
		return nil, fmt.Errorf("failed to create free subscription: %w", err)
	}

	subscription := &models.SubscriptionWithPlan{
		UserSubscription: models.UserSubscription{
			ID:                 subscriptionID,
			UserID:             userID,
			PlanID:             freePlan.ID,
			Status:             "active",
			BillingCycle:       "monthly",
			CurrentPeriodStart: now,
			CurrentPeriodEnd:   periodEnd,
			CreatedAt:          now,
			UpdatedAt:          now,
		},
		Plan: *freePlan,
	}

	return subscription, nil
}

// getDefaultFreeSubscription returns a default free subscription (kept for backward compatibility)
func getDefaultFreeSubscription(userID string) (*models.SubscriptionWithPlan, error) {
	// Get the free plan
	freePlan, err := GetSubscriptionPlanByID("00000000-0000-0000-0000-000000000001")
	if err != nil {
		return nil, fmt.Errorf("failed to get free plan: %w", err)
	}

	subscription := &models.SubscriptionWithPlan{
		UserSubscription: models.UserSubscription{
			ID:           uuid.New().String(),
			UserID:       userID,
			PlanID:       freePlan.ID,
			Status:       "active",
			BillingCycle: "monthly",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		Plan: *freePlan,
	}

	return subscription, nil
}

// CreateUserSubscription creates a new subscription for a user
func CreateUserSubscription(userID, planID, billingCycle, stripeSubscriptionID string) (*models.SubscriptionWithPlan, error) {
	// Get the plan details
	plan, err := GetSubscriptionPlanByID(planID)
	if err != nil {
		return nil, fmt.Errorf("failed to get plan: %w", err)
	}

	// Calculate period dates
	now := time.Now()
	var periodEnd time.Time
	if billingCycle == "monthly" {
		periodEnd = now.AddDate(0, 1, 0)
	} else {
		periodEnd = now.AddDate(1, 0, 0)
	}

	subscriptionID := uuid.New().String()

	query := `
		INSERT INTO user_subscriptions (id, user_id, plan_id, status, billing_cycle, 
		                               stripe_subscription_id, current_period_start, current_period_end)
		VALUES ($1, $2, $3, 'active', $4, $5, $6, $7)
	`

	_, err = database.DB.Exec(query, subscriptionID, userID, planID, billingCycle,
		stripeSubscriptionID, now, periodEnd)
	if err != nil {
		return nil, fmt.Errorf("failed to create subscription: %w", err)
	}

	return &models.SubscriptionWithPlan{
		UserSubscription: models.UserSubscription{
			ID:                   subscriptionID,
			UserID:               userID,
			PlanID:               planID,
			Status:               "active",
			BillingCycle:         billingCycle,
			StripeSubscriptionID: stripeSubscriptionID,
			CurrentPeriodStart:   now,
			CurrentPeriodEnd:     periodEnd,
			CreatedAt:            now,
			UpdatedAt:            now,
		},
		Plan: *plan,
	}, nil
}

// UpdateUserSubscription updates a user's subscription
func UpdateUserSubscription(userID string, updates map[string]interface{}) error {
	// Build dynamic query
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	for key, value := range updates {
		setParts = append(setParts, fmt.Sprintf("%s = $%d", key, argIndex))
		args = append(args, value)
		argIndex++
	}

	if len(setParts) == 0 {
		return fmt.Errorf("no updates provided")
	}

	query := fmt.Sprintf(`
		UPDATE user_subscriptions 
		SET %s, updated_at = NOW()
		WHERE user_id = $%d AND status = 'active'
	`, fmt.Sprintf("%s", setParts[0]), argIndex)

	// Add remaining set parts
	for i := 1; i < len(setParts); i++ {
		query = fmt.Sprintf(`
			UPDATE user_subscriptions 
			SET %s, updated_at = NOW()
			WHERE user_id = $%d AND status = 'active'
		`, fmt.Sprintf("%s, %s", setParts[0], setParts[i]), argIndex)
	}

	args = append(args, userID)

	_, err := database.DB.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	return nil
}

// GetUserSubscriptionUsage returns current usage statistics for a user
func GetUserSubscriptionUsage(userID string) (*models.SubscriptionUsage, error) {
	subscription, err := GetUserSubscription(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get subscription: %w", err)
	}

	// Count sessions used this month
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	query := `
		SELECT COUNT(*) 
		FROM interview_sessions 
		WHERE user_id = $1 AND created_at >= $2
	`

	var sessionsUsed int
	err = database.DB.QueryRow(query, userID, startOfMonth).Scan(&sessionsUsed)
	if err != nil {
		return nil, fmt.Errorf("failed to count sessions: %w", err)
	}

	return &models.SubscriptionUsage{
		SessionsUsedThisMonth: sessionsUsed,
		MaxSessionsPerMonth:   subscription.Plan.MaxSessionsPerMonth,
		CurrentPlan:           subscription.Plan.Name,
		Status:                subscription.Status,
		ExpiresAt:             subscription.CurrentPeriodEnd,
	}, nil
}

// CanUserCreateSession checks if a user can create a new session based on their subscription
func CanUserCreateSession(userID string) (bool, error) {
	usage, err := GetUserSubscriptionUsage(userID)
	if err != nil {
		return false, fmt.Errorf("failed to get usage: %w", err)
	}

	// If max_sessions_per_month is 0, it means unlimited
	if usage.MaxSessionsPerMonth == 0 {
		return true, nil
	}

	return usage.SessionsUsedThisMonth < usage.MaxSessionsPerMonth, nil
}

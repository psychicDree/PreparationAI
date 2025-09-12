package handlers

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"preparation-ai/internal/services"
)

// GetSubscriptionPlans retrieves all available subscription plans
func GetSubscriptionPlans(c *fiber.Ctx) error {
	plans, err := services.GetSubscriptionPlans()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve subscription plans",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    plans,
	})
}

// GetUserSubscription retrieves the current user's subscription
func GetUserSubscription(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	subscription, err := services.GetUserSubscription(userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve user subscription",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    subscription,
	})
}

// GetUserSubscriptionUsage retrieves the current user's subscription usage
func GetUserSubscriptionUsage(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	usage, err := services.GetUserSubscriptionUsage(userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve subscription usage",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    usage,
	})
}

// CreateSubscriptionRequest represents the request to create a subscription
type CreateSubscriptionRequest struct {
	PlanID       string `json:"plan_id" validate:"required"`
	BillingCycle string `json:"billing_cycle" validate:"required,oneof=monthly yearly"`
}

// CreateUserSubscription creates a new subscription for the current user
func CreateUserSubscription(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req CreateSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate request
	if req.PlanID == "" || (req.BillingCycle != "monthly" && req.BillingCycle != "yearly") {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Plan ID and billing cycle are required",
		})
	}

	// For now, we'll create a subscription without Stripe integration
	// In a real implementation, you would create a Stripe subscription first
	subscription, err := services.CreateUserSubscription(userID, req.PlanID, req.BillingCycle, "")
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create subscription",
		})
	}

	return c.Status(http.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    subscription,
	})
}

// UpdateUserSubscription updates the current user's subscription
func UpdateUserSubscription(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	err := services.UpdateUserSubscription(userID, updates)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update subscription",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Subscription updated successfully",
	})
}

// CheckSessionEligibility checks if the user can create a new session
func CheckSessionEligibility(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	canCreate, err := services.CanUserCreateSession(userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check session eligibility",
		})
	}

	usage, err := services.GetUserSubscriptionUsage(userID)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve usage information",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"can_create_session": canCreate,
			"usage":              usage,
		},
	})
}

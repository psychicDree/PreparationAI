package main

import (
	"log"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"preparation-ai/internal/config"
	"preparation-ai/internal/handlers"
	"preparation-ai/internal/middleware"
	"preparation-ai/internal/database"
)

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	log.Printf("Starting PreparationAI server in %s mode", cfg.Environment)

	// Initialize database
	db, err := database.Connect()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	})

	// Middleware
	app.Use(logger.New())
	
	// CORS configuration
	corsOrigins := "http://localhost:5173,http://localhost:3000"
	if cfg.IsProduction() {
		// In production, you'd set specific allowed origins
		corsOrigins = "https://yourdomain.com"
	}
	
	app.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// Routes
	api := app.Group("/api/v1")

	// Health check
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":      "ok",
			"message":     "PreparationAI API is running",
			"environment": cfg.Environment,
			"version":     "1.0.0",
		})
	})

	// Public routes
	api.Get("/subscription-plans", handlers.GetSubscriptionPlans) // Public route

	// Auth routes
	auth := api.Group("/auth")
	auth.Post("/register", handlers.Register)
	auth.Post("/login", handlers.Login)
	auth.Post("/logout", middleware.Protected(), handlers.Logout)

	// Protected routes
	protected := api.Group("/", middleware.Protected())
	
	// User routes
	protected.Get("/profile", handlers.GetProfile)
	protected.Put("/profile", handlers.UpdateProfile)

	// Interview session routes
	protected.Post("/sessions", handlers.CreateSession)
	protected.Get("/sessions", handlers.GetSessions)
	protected.Get("/sessions/:id", handlers.GetSession)
	protected.Post("/sessions/:id/questions", handlers.GenerateQuestions)
	protected.Post("/sessions/:id/responses", handlers.SubmitResponse)
	protected.Get("/sessions/:id/feedback", handlers.GetFeedback)

	// Payment routes
	protected.Post("/payments/create-intent", handlers.CreatePaymentIntent)
	protected.Post("/payments/confirm", handlers.ConfirmPayment)

	// Subscription routes
	protected.Get("/subscription", handlers.GetUserSubscription)
	protected.Get("/subscription/usage", handlers.GetUserSubscriptionUsage)
	protected.Post("/subscription", handlers.CreateUserSubscription)
	protected.Put("/subscription", handlers.UpdateUserSubscription)
	protected.Get("/subscription/eligibility", handlers.CheckSessionEligibility)

	// WebSocket routes
	ws := app.Group("/ws")
	ws.Use(handlers.WebSocketUpgrade)
	ws.Get("/", websocket.New(handlers.WebSocketHandler))

	// Start WebSocket manager in a goroutine
	go handlers.GetWebSocketManager().Start()

	// Start server
	address := cfg.Server.Host + ":" + cfg.Server.Port
	log.Printf("Server starting on %s", address)
	log.Fatal(app.Listen(address))
}

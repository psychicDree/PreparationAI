package handlers

import (
	"log"

	"preparation-ai/internal/config"
	"preparation-ai/internal/models"
	"preparation-ai/internal/services"

	"github.com/gofiber/fiber/v2"
)

func CreateSession(c *fiber.Ctx) error {
	// Get user ID from JWT (from middleware)
	userID := c.Locals("userID").(string)

	var req models.CreateSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Create session in database
	session, err := services.CreateInterviewSession(userID, req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create session: " + err.Error(),
		})
	}

	return c.Status(201).JSON(session)
}

func GetSessions(c *fiber.Ctx) error {
	// Get user ID from JWT (from middleware)
	userID := c.Locals("userID").(string)

	// Get sessions from database
	sessions, err := services.GetUserSessions(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to get sessions: " + err.Error(),
		})
	}

	return c.JSON(sessions)
}

func GetSession(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	userID := c.Locals("userID").(string)

	// Get session from database
	session, err := services.GetSessionByID(sessionID, userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Session not found",
		})
	}

	return c.JSON(session)
}

func GenerateQuestions(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	userID := c.Locals("userID").(string)

	var req models.GenerateQuestionsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Verify session belongs to user
	session, err := services.GetSessionByID(sessionID, userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Session not found",
		})
	}

	// Questions are generated once per session; return the stored set on repeat calls
	existing, err := services.GetSessionQuestions(sessionID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to load questions: " + err.Error(),
		})
	}
	if len(existing) > 0 {
		return c.JSON(existing)
	}

	paid := session.PaymentIntentID != ""
	if !paid && config.AppConfig != nil && config.AppConfig.Stripe.RequirePayment {
		return c.Status(402).JSON(fiber.Map{
			"error": "Payment required for this session",
		})
	}

	// A paid session's type is what was paid for; don't let the request change it.
	if req.SessionType != "" && !paid {
		if !isValidSessionType(req.SessionType) {
			return c.Status(400).JSON(fiber.Map{
				"error": "Invalid session type",
			})
		}
		session.SessionType = req.SessionType
	}
	if len(req.Tags) > 0 {
		session.Tags = req.Tags
	}
	if req.Experience < 0 || req.Experience > 5 {
		return c.Status(400).JSON(fiber.Map{
			"error": "experience must be between 0 and 5",
		})
	}

	if err := services.UpdateSessionSetup(sessionID, session.SessionType, session.Tags, req.Experience, req.Preferences); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to update session: " + err.Error(),
		})
	}

	questions, err := services.GenerateSessionQuestions(services.QuestionParams{
		SessionID:   sessionID,
		SessionType: session.SessionType,
		Tags:        session.Tags,
		Experience:  req.Experience,
		Preferences: req.Preferences,
	})
	if err != nil {
		log.Printf("Question generation failed for session %s: %v", sessionID, err)
		return c.Status(502).JSON(fiber.Map{
			"error": "Failed to generate questions",
		})
	}

	if err := services.CreateSessionQuestions(sessionID, questions); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to save questions: " + err.Error(),
		})
	}

	stored, err := services.GetSessionQuestions(sessionID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to load questions: " + err.Error(),
		})
	}

	return c.JSON(stored)
}

func SubmitResponse(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	userID := c.Locals("userID").(string)

	var req models.SubmitResponseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.QuestionID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "question_id is required",
		})
	}

	// Verify session belongs to user
	_, err := services.GetSessionByID(sessionID, userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Session not found",
		})
	}

	belongs, err := services.QuestionBelongsToSession(req.QuestionID, sessionID)
	if err != nil || !belongs {
		return c.Status(404).JSON(fiber.Map{
			"error": "Question not found in this session",
		})
	}

	// Create response in database
	response, err := services.CreateUserResponse(sessionID, req.QuestionID, req.ResponseText, req.AudioURL)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to submit response: " + err.Error(),
		})
	}

	return c.Status(201).JSON(response)
}

// GenerateFeedback evaluates the session's answers with AI, stores the feedback and completes the session
func GenerateFeedback(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	userID := c.Locals("userID").(string)

	session, err := services.GetSessionByID(sessionID, userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Session not found",
		})
	}

	// Feedback is generated once per session
	if existing, err := services.GetSessionFeedback(sessionID, userID); err == nil {
		return c.JSON(existing)
	}

	answers, err := services.GetSessionAnswers(sessionID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to load answers: " + err.Error(),
		})
	}
	if len(answers) == 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "Session has no questions to evaluate",
		})
	}

	feedback, err := services.EvaluateSession(session.SessionType, session.Tags, answers)
	if err != nil {
		log.Printf("Evaluation failed for session %s: %v", sessionID, err)
		return c.Status(502).JSON(fiber.Map{
			"error": "Failed to generate feedback",
		})
	}

	if err := services.CreateSessionFeedback(sessionID, feedback); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to save feedback: " + err.Error(),
		})
	}

	if err := services.UpdateSessionStatus(sessionID, models.SessionCompleted); err != nil {
		log.Printf("Failed to mark session %s completed: %v", sessionID, err)
	}

	return c.Status(201).JSON(feedback)
}

func isValidSessionType(t models.SessionType) bool {
	switch t {
	case models.QuickDrill, models.Standard, models.DeepDive:
		return true
	}
	return false
}

func GetFeedback(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	userID := c.Locals("userID").(string)

	// Get feedback from database
	feedback, err := services.GetSessionFeedback(sessionID, userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Feedback not found",
		})
	}

	return c.JSON(feedback)
}

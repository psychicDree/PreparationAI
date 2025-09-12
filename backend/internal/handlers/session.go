package handlers

import (
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

	var req models.GenerateQuestionsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// TODO: Generate questions using AI service
	questions, err := services.GenerateInterviewQuestions(sessionID, req.Experience, req.Preferences)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to generate questions",
		})
	}

	return c.JSON(questions)
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

	// Verify session belongs to user
	_, err := services.GetSessionByID(sessionID, userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Session not found",
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

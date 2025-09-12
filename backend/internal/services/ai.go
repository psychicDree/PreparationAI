package services

import (
	"fmt"
	"preparation-ai/internal/config"
	"preparation-ai/internal/models"
)

type OpenAIRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	MaxTokens int      `json:"max_tokens"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAIResponse struct {
	Choices []Choice `json:"choices"`
}

type Choice struct {
	Message Message `json:"message"`
}

func GenerateInterviewQuestions(sessionID string, experience int, preferences []string) ([]models.Question, error) {
	// TODO: Implement OpenAI API integration
	// For now, return mock questions
	
	questions := []models.Question{
		{
			ID:           "q1",
			SessionID:    sessionID,
			QuestionText: "How would you secure a client–server multiplayer architecture in Unity using Netcode?",
			QuestionType: "technical",
			OrderIndex:   1,
		},
		{
			ID:           "q2",
			SessionID:    sessionID,
			QuestionText: "Explain the difference between client-side and server-side authority in multiplayer games.",
			QuestionType: "technical",
			OrderIndex:   2,
		},
		{
			ID:           "q3",
			SessionID:    sessionID,
			QuestionText: "How would you handle network synchronization for a real-time multiplayer game?",
			QuestionType: "system_design",
			OrderIndex:   3,
		},
	}

	return questions, nil
}

func EvaluateResponse(questionText string, responseText string) (*models.SessionFeedback, error) {
	// TODO: Implement OpenAI API integration for response evaluation
	// For now, return mock feedback
	
	feedback := &models.SessionFeedback{
		TechnicalScore:      7.5,
		CommunicationScore:  6.5,
		ProblemSolvingScore: 9.0,
		Strengths:           []string{"Solid understanding of server authority", "Good problem-solving approach"},
		Weaknesses:          []string{"Missed details on synchronization strategies", "Could improve communication clarity"},
		Recommendations:     []string{"Study concurrency in Netcode", "Practice explaining technical concepts"},
	}

	return feedback, nil
}

func callOpenAIAPI(prompt string) (string, error) {
	cfg := config.AppConfig
	if cfg == nil {
		return "", fmt.Errorf("configuration not loaded")
	}

	if cfg.OpenAI.APIKey == "" {
		return "", fmt.Errorf("OpenAI API key not found")
	}

	// TODO: Implement actual OpenAI API call
	// This is a placeholder implementation
	
	request := OpenAIRequest{
		Model: cfg.OpenAI.Model,
		Messages: []Message{
			{
				Role:    "system",
				Content: "You are an expert technical interviewer specializing in game development and Unity.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
		MaxTokens: cfg.OpenAI.MaxTokens,
	}

	// TODO: Make HTTP request to OpenAI API
	_ = request

	return "Mock AI response", nil
}

package models

import (
	"time"
)

type SessionType string

const (
	QuickDrill  SessionType = "quick_drill"
	Standard    SessionType = "standard"
	DeepDive    SessionType = "deep_dive"
)

type SessionStatus string

const (
	SessionActive    SessionStatus = "active"
	SessionCompleted SessionStatus = "completed"
	SessionCancelled SessionStatus = "cancelled"
)

type InterviewSession struct {
	ID               string        `json:"id" db:"id"`
	UserID           string        `json:"user_id" db:"user_id"`
	SessionType      SessionType   `json:"session_type" db:"session_type"`
	Status           SessionStatus `json:"status" db:"status"`
	Tags             []string      `json:"tags" db:"tags"`
	PaymentIntentID  string        `json:"payment_intent_id,omitempty" db:"payment_intent_id"`
	CreatedAt        time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time     `json:"updated_at" db:"updated_at"`
}

type Question struct {
	ID          string    `json:"id" db:"id"`
	SessionID   string    `json:"session_id" db:"session_id"`
	QuestionText string   `json:"question_text" db:"question_text"`
	QuestionType string   `json:"question_type" db:"question_type"`
	OrderIndex  int       `json:"order_index" db:"order_index"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type UserResponse struct {
	ID           string    `json:"id" db:"id"`
	SessionID    string    `json:"session_id" db:"session_id"`
	QuestionID   string    `json:"question_id" db:"question_id"`
	ResponseText string    `json:"response_text" db:"response_text"`
	AudioURL     string    `json:"audio_url" db:"audio_url"`
	SubmittedAt  time.Time `json:"submitted_at" db:"submitted_at"`
}

type SessionFeedback struct {
	ID                  string    `json:"id" db:"id"`
	SessionID           string    `json:"session_id" db:"session_id"`
	TechnicalScore      float64   `json:"technical_score" db:"technical_score"`
	CommunicationScore  float64   `json:"communication_score" db:"communication_score"`
	ProblemSolvingScore float64   `json:"problem_solving_score" db:"problem_solving_score"`
	Strengths           []string  `json:"strengths" db:"strengths"`
	Weaknesses          []string  `json:"weaknesses" db:"weaknesses"`
	Recommendations     []string  `json:"recommendations" db:"recommendations"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
}

type CreateSessionRequest struct {
	SessionType SessionType `json:"session_type" validate:"required"`
	Tags        []string    `json:"tags" validate:"required"`
}

type GenerateQuestionsRequest struct {
	Experience  int      `json:"experience" validate:"required"`
	Preferences []string `json:"preferences" validate:"required"`
}

type SubmitResponseRequest struct {
	QuestionID   string `json:"question_id" validate:"required"`
	ResponseText string `json:"response_text"`
	AudioURL     string `json:"audio_url"`
}

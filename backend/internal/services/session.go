package services

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"preparation-ai/internal/database"
	"preparation-ai/internal/models"
)

// QuestionAnswer pairs a question with the candidate's submitted answer.
type QuestionAnswer struct {
	QuestionText string
	ResponseText string
}

// GetSessionQA returns the question/answer pairs for a session, ordered by the
// question order. Questions without a submitted answer have an empty response.
func GetSessionQA(sessionID string) ([]QuestionAnswer, error) {
	query := `
		SELECT sq.question_text, COALESCE(ur.response_text, '')
		FROM session_questions sq
		LEFT JOIN user_responses ur ON ur.question_id = sq.id
		WHERE sq.session_id = $1
		ORDER BY sq.order_index
	`

	rows, err := database.DB.Query(query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get session Q&A: %w", err)
	}
	defer rows.Close()

	var pairs []QuestionAnswer
	for rows.Next() {
		var qa QuestionAnswer
		if err := rows.Scan(&qa.QuestionText, &qa.ResponseText); err != nil {
			return nil, fmt.Errorf("failed to scan Q&A: %w", err)
		}
		pairs = append(pairs, qa)
	}

	return pairs, rows.Err()
}

// CreateInterviewSession creates a new interview session
func CreateInterviewSession(userID string, req models.CreateSessionRequest) (*models.InterviewSession, error) {
	sessionID := uuid.New().String()

	query := `
		INSERT INTO interview_sessions (id, user_id, session_type, status, tags, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, user_id, session_type, status, tags, created_at, updated_at
	`

	now := time.Now()
	var session models.InterviewSession
	err := database.DB.QueryRow(
		query,
		sessionID,
		userID,
		req.SessionType,
		models.SessionActive,
		req.Tags,
		now,
		now,
	).Scan(
		&session.ID,
		&session.UserID,
		&session.SessionType,
		&session.Status,
		&session.Tags,
		&session.CreatedAt,
		&session.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return &session, nil
}

// GetUserSessions retrieves all sessions for a user
func GetUserSessions(userID string) ([]models.InterviewSession, error) {
	query := `
		SELECT id, user_id, session_type, status, tags, payment_intent_id, created_at, updated_at
		FROM interview_sessions
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := database.DB.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get sessions: %w", err)
	}
	defer rows.Close()

	var sessions []models.InterviewSession
	for rows.Next() {
		var session models.InterviewSession
		var paymentIntentID sql.NullString

		err := rows.Scan(
			&session.ID,
			&session.UserID,
			&session.SessionType,
			&session.Status,
			&session.Tags,
			&paymentIntentID,
			&session.CreatedAt,
			&session.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}

		if paymentIntentID.Valid {
			session.PaymentIntentID = paymentIntentID.String
		}

		sessions = append(sessions, session)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating sessions: %w", err)
	}

	return sessions, nil
}

// GetSessionByID retrieves a specific session by ID
func GetSessionByID(sessionID, userID string) (*models.InterviewSession, error) {
	query := `
		SELECT id, user_id, session_type, status, tags, payment_intent_id, created_at, updated_at
		FROM interview_sessions
		WHERE id = $1 AND user_id = $2
	`

	var session models.InterviewSession
	var paymentIntentID sql.NullString

	err := database.DB.QueryRow(query, sessionID, userID).Scan(
		&session.ID,
		&session.UserID,
		&session.SessionType,
		&session.Status,
		&session.Tags,
		&paymentIntentID,
		&session.CreatedAt,
		&session.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("session not found")
		}
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	if paymentIntentID.Valid {
		session.PaymentIntentID = paymentIntentID.String
	}

	return &session, nil
}

// MarkSessionPaid records the PaymentIntent on a session once payment has been
// verified with Stripe.
func MarkSessionPaid(sessionID, paymentIntentID string) error {
	query := `
		UPDATE interview_sessions
		SET payment_intent_id = $1, updated_at = $2
		WHERE id = $3
	`

	result, err := database.DB.Exec(query, paymentIntentID, time.Now(), sessionID)
	if err != nil {
		return fmt.Errorf("failed to mark session paid: %w", err)
	}

	rows, err := result.RowsAffected()
	if err == nil && rows == 0 {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	return nil
}

// CreateSessionQuestions creates questions for a session
func CreateSessionQuestions(sessionID string, questions []models.Question) error {
	tx, err := database.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	query := `
		INSERT INTO session_questions (id, session_id, question_text, question_type, order_index, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	now := time.Now()
	for _, question := range questions {
		_, err := tx.Exec(
			query,
			question.ID,
			sessionID,
			question.QuestionText,
			question.QuestionType,
			question.OrderIndex,
			now,
		)
		if err != nil {
			return fmt.Errorf("failed to insert question: %w", err)
		}
	}

	return tx.Commit()
}

// CreateUserResponse creates a user response for a question
func CreateUserResponse(sessionID, questionID, responseText, audioURL string) (*models.UserResponse, error) {
	responseID := uuid.New().String()

	query := `
		INSERT INTO user_responses (id, question_id, response_text, audio_url, submitted_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, question_id, response_text, audio_url, submitted_at
	`

	now := time.Now()
	var response models.UserResponse
	err := database.DB.QueryRow(
		query,
		responseID,
		questionID,
		responseText,
		audioURL,
		now,
	).Scan(
		&response.ID,
		&response.QuestionID,
		&response.ResponseText,
		&response.AudioURL,
		&response.SubmittedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create response: %w", err)
	}

	response.SessionID = sessionID
	return &response, nil
}

// GetSessionFeedback retrieves feedback for a session
func GetSessionFeedback(sessionID, userID string) (*models.SessionFeedback, error) {
	// First verify the session belongs to the user
	_, err := GetSessionByID(sessionID, userID)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT id, session_id, technical_score, communication_score, problem_solving_score,
		       strengths, weaknesses, recommendations, created_at
		FROM session_feedback
		WHERE session_id = $1
	`

	var feedback models.SessionFeedback
	err = database.DB.QueryRow(query, sessionID).Scan(
		&feedback.ID,
		&feedback.SessionID,
		&feedback.TechnicalScore,
		&feedback.CommunicationScore,
		&feedback.ProblemSolvingScore,
		pq.Array(&feedback.Strengths),
		pq.Array(&feedback.Weaknesses),
		pq.Array(&feedback.Recommendations),
		&feedback.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("feedback not found")
		}
		return nil, fmt.Errorf("failed to get feedback: %w", err)
	}

	return &feedback, nil
}

// CreateSessionFeedback creates feedback for a session
func CreateSessionFeedback(sessionID string, feedback *models.SessionFeedback) error {
	feedbackID := uuid.New().String()

	query := `
		INSERT INTO session_feedback (id, session_id, technical_score, communication_score, 
		                            problem_solving_score, strengths, weaknesses, recommendations, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := database.DB.Exec(
		query,
		feedbackID,
		sessionID,
		feedback.TechnicalScore,
		feedback.CommunicationScore,
		feedback.ProblemSolvingScore,
		pq.Array(feedback.Strengths),
		pq.Array(feedback.Weaknesses),
		pq.Array(feedback.Recommendations),
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to create feedback: %w", err)
	}

	return nil
}

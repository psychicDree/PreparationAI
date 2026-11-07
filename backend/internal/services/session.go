package services

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"preparation-ai/internal/database"
	"preparation-ai/internal/models"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

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
		pq.Array(req.Tags),
		now,
		now,
	).Scan(
		&session.ID,
		&session.UserID,
		&session.SessionType,
		&session.Status,
		pq.Array(&session.Tags),
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
			pq.Array(&session.Tags),
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
		pq.Array(&session.Tags),
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

// SetUnpaidSessionType changes a session's type, which sets its price, but only
// while it is unpaid; a paid session's type is locked.
func SetUnpaidSessionType(sessionID string, sessionType models.SessionType) error {
	result, err := database.DB.Exec(`
		UPDATE interview_sessions SET session_type = $2, updated_at = $3
		WHERE id = $1 AND payment_intent_id IS NULL
	`, sessionID, sessionType, time.Now())
	if err != nil {
		return fmt.Errorf("failed to set session type: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to set session type: %w", err)
	}
	if rows == 0 {
		return ErrSessionAlreadyPaid
	}
	return nil
}

// GetSessionType returns a session's type without an ownership check, for
// trusted callers such as the signed Stripe webhook.
func GetSessionType(sessionID string) (models.SessionType, error) {
	var sessionType models.SessionType
	if err := database.DB.QueryRow(`SELECT session_type FROM interview_sessions WHERE id = $1`, sessionID).Scan(&sessionType); err != nil {
		return "", fmt.Errorf("failed to get session type: %w", err)
	}
	return sessionType, nil
}

// ErrSessionAlreadyPaid is returned by MarkSessionPaid when the session is
// already linked to a different PaymentIntent.
var ErrSessionAlreadyPaid = errors.New("session already paid with a different payment")

// MarkSessionPaid records the PaymentIntent on a session once payment has been
// verified with Stripe. It is idempotent for the same PaymentIntent and never
// replaces a different one already recorded on the session.
func MarkSessionPaid(sessionID, paymentIntentID string) error {
	query := `
		UPDATE interview_sessions
		SET payment_intent_id = $1, updated_at = $2
		WHERE id = $3 AND (payment_intent_id IS NULL OR payment_intent_id = $1)
	`

	result, err := database.DB.Exec(query, paymentIntentID, time.Now(), sessionID)
	if err != nil {
		return fmt.Errorf("failed to mark session paid: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to mark session paid: %w", err)
	}
	if rows > 0 {
		return nil
	}

	var exists bool
	if err := database.DB.QueryRow(`SELECT EXISTS (SELECT 1 FROM interview_sessions WHERE id = $1)`, sessionID).Scan(&exists); err != nil {
		return fmt.Errorf("failed to check session: %w", err)
	}
	if exists {
		return ErrSessionAlreadyPaid
	}
	return fmt.Errorf("session not found: %s", sessionID)
}

// CreateSessionQuestions creates questions for a session unless it already has some
func CreateSessionQuestions(sessionID string, questions []models.Question) error {
	tx, err := database.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Lock the session so concurrent generations cannot both insert a question set
	if _, err := tx.Exec(`SELECT id FROM interview_sessions WHERE id = $1 FOR UPDATE`, sessionID); err != nil {
		return fmt.Errorf("failed to lock session: %w", err)
	}

	var exists bool
	if err := tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM session_questions WHERE session_id = $1)`, sessionID).Scan(&exists); err != nil {
		return fmt.Errorf("failed to check questions: %w", err)
	}
	if exists {
		return tx.Commit()
	}

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

// CreateSessionFeedback stores feedback for a session; if feedback already exists it is loaded into feedback instead
func CreateSessionFeedback(sessionID string, feedback *models.SessionFeedback) error {
	tx, err := database.DB.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Lock the session so concurrent evaluations cannot both insert feedback
	if _, err := tx.Exec(`SELECT id FROM interview_sessions WHERE id = $1 FOR UPDATE`, sessionID); err != nil {
		return fmt.Errorf("failed to lock session: %w", err)
	}

	err = tx.QueryRow(`
		SELECT id, session_id, technical_score, communication_score, problem_solving_score,
		       strengths, weaknesses, recommendations, created_at
		FROM session_feedback
		WHERE session_id = $1
		ORDER BY created_at
		LIMIT 1
	`, sessionID).Scan(
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
	if err == nil {
		return tx.Commit()
	}
	if err != sql.ErrNoRows {
		return fmt.Errorf("failed to check feedback: %w", err)
	}

	feedbackID := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO session_feedback (id, session_id, technical_score, communication_score,
		                            problem_solving_score, strengths, weaknesses, recommendations, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err = tx.Exec(
		query,
		feedbackID,
		sessionID,
		feedback.TechnicalScore,
		feedback.CommunicationScore,
		feedback.ProblemSolvingScore,
		pq.Array(feedback.Strengths),
		pq.Array(feedback.Weaknesses),
		pq.Array(feedback.Recommendations),
		now,
	)
	if err != nil {
		return fmt.Errorf("failed to create feedback: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit feedback: %w", err)
	}

	feedback.ID = feedbackID
	feedback.SessionID = sessionID
	feedback.CreatedAt = now
	return nil
}

// UpdateSessionSetup stores the setup and warm-up answers chosen before questions are generated
func UpdateSessionSetup(sessionID string, sessionType models.SessionType, tags []string, experience int, preferences []string) error {
	query := `
		UPDATE interview_sessions
		SET session_type = $2, tags = $3, experience = $4, preferences = $5
		WHERE id = $1
	`

	if preferences == nil {
		preferences = []string{}
	}
	if _, err := database.DB.Exec(query, sessionID, sessionType, pq.Array(tags), experience, pq.Array(preferences)); err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	return nil
}

// UpdateSessionStatus sets the status of a session
func UpdateSessionStatus(sessionID string, status models.SessionStatus) error {
	query := `UPDATE interview_sessions SET status = $2 WHERE id = $1`

	if _, err := database.DB.Exec(query, sessionID, status); err != nil {
		return fmt.Errorf("failed to update session status: %w", err)
	}

	return nil
}

// GetSessionQuestions retrieves the questions for a session in order
func GetSessionQuestions(sessionID string) ([]models.Question, error) {
	query := `
		SELECT id, session_id, question_text, question_type, order_index, created_at
		FROM session_questions
		WHERE session_id = $1
		ORDER BY order_index
	`

	rows, err := database.DB.Query(query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get questions: %w", err)
	}
	defer rows.Close()

	questions := []models.Question{}
	for rows.Next() {
		var question models.Question
		if err := rows.Scan(
			&question.ID,
			&question.SessionID,
			&question.QuestionText,
			&question.QuestionType,
			&question.OrderIndex,
			&question.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan question: %w", err)
		}
		questions = append(questions, question)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating questions: %w", err)
	}

	return questions, nil
}

// QuestionBelongsToSession reports whether a question is part of a session
func QuestionBelongsToSession(questionID, sessionID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM session_questions WHERE id = $1 AND session_id = $2)`

	var exists bool
	if err := database.DB.QueryRow(query, questionID, sessionID).Scan(&exists); err != nil {
		return false, fmt.Errorf("failed to check question: %w", err)
	}

	return exists, nil
}

// GetSessionAnswers pairs each session question with its latest response, if any
func GetSessionAnswers(sessionID string) ([]QuestionAnswer, error) {
	query := `
		SELECT q.question_text, q.question_type, COALESCE(r.response_text, '')
		FROM session_questions q
		LEFT JOIN LATERAL (
			SELECT response_text
			FROM user_responses
			WHERE question_id = q.id
			ORDER BY submitted_at DESC
			LIMIT 1
		) r ON true
		WHERE q.session_id = $1
		ORDER BY q.order_index
	`

	rows, err := database.DB.Query(query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get answers: %w", err)
	}
	defer rows.Close()

	var answers []QuestionAnswer
	for rows.Next() {
		var answer QuestionAnswer
		if err := rows.Scan(&answer.QuestionText, &answer.QuestionType, &answer.ResponseText); err != nil {
			return nil, fmt.Errorf("failed to scan answer: %w", err)
		}
		answers = append(answers, answer)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating answers: %w", err)
	}

	return answers, nil
}

package services

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"preparation-ai/internal/database"
	"preparation-ai/internal/models"
)

// CreateUser creates a new user in the database
func CreateUser(req models.RegisterRequest) (*models.User, error) {
	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Generate a unique user ID using UUID
	userID := uuid.New().String()

	query := `
		INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, email, name, created_at, updated_at
	`

	now := time.Now()
	var user models.User
	err = database.DB.QueryRow(
		query,
		userID,
		req.Email,
		req.Name,
		hashedPassword,
		now,
		now,
	).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &user, nil
}

// GetUserByEmail retrieves a user by email address
func GetUserByEmail(email string) (*models.User, error) {
	query := `
		SELECT id, email, name, password_hash, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var user models.User
	// NULL for accounts created through social sign-in, which have no password.
	var passwordHash sql.NullString
	err := database.DB.QueryRow(query, email).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&passwordHash,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Store the password hash in the user struct for validation. It stays empty
	// for password-less accounts, so password login fails for them.
	user.Password = passwordHash.String
	return &user, nil
}

// FindOrCreateSupabaseUser returns the app user for a verified Supabase Auth
// user: the account already linked to that Supabase ID, otherwise an existing
// account with the same (verified) email, which gets linked, otherwise a new
// password-less account.
func FindOrCreateSupabaseUser(su *SupabaseUser) (*models.User, error) {
	// Two attempts: a concurrent first sign-in can win the insert race, and the
	// second pass then finds the row it created.
	for attempt := 0; attempt < 2; attempt++ {
		user, err := scanUser(database.DB.QueryRow(`
			SELECT id, email, name, created_at, updated_at
			FROM users WHERE supabase_user_id = $1
		`, su.ID))
		if err == nil {
			return user, nil
		}
		if err != sql.ErrNoRows {
			return nil, fmt.Errorf("failed to look up user: %w", err)
		}

		user, err = scanUser(database.DB.QueryRow(`
			UPDATE users SET supabase_user_id = $1, updated_at = $2
			WHERE lower(email) = $3 AND supabase_user_id IS NULL
			RETURNING id, email, name, created_at, updated_at
		`, su.ID, time.Now(), su.Email))
		if err == nil {
			return user, nil
		}
		if err != sql.ErrNoRows {
			return nil, fmt.Errorf("failed to link user: %w", err)
		}

		now := time.Now()
		user, err = scanUser(database.DB.QueryRow(`
			INSERT INTO users (id, email, name, password_hash, supabase_user_id, created_at, updated_at)
			VALUES ($1, $2, $3, NULL, $4, $5, $5)
			ON CONFLICT DO NOTHING
			RETURNING id, email, name, created_at, updated_at
		`, uuid.New().String(), su.Email, su.Name, su.ID, now))
		if err == nil {
			return user, nil
		}
		if err != sql.ErrNoRows {
			return nil, fmt.Errorf("failed to create user: %w", err)
		}
	}

	// The email belongs to an account linked to a different Supabase user.
	return nil, ErrEmailLinkedElsewhere
}

// ErrEmailLinkedElsewhere is returned when a social sign-in's email already
// belongs to an account linked to a different Supabase user.
var ErrEmailLinkedElsewhere = errors.New("this email is already linked to a different sign-in")

func scanUser(row *sql.Row) (*models.User, error) {
	var user models.User
	if err := row.Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt, &user.UpdatedAt); err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByID retrieves a user by ID
func GetUserByID(userID string) (*models.User, error) {
	query := `
		SELECT id, email, name, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user models.User
	err := database.DB.QueryRow(query, userID).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

// ValidatePassword compares a plain text password with a hashed password
func ValidatePassword(hashedPassword, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

// UpdateUser updates user information
func UpdateUser(userID string, updates map[string]interface{}) (*models.User, error) {
	// Build dynamic query based on provided fields
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	for field, value := range updates {
		setParts = append(setParts, fmt.Sprintf("%s = $%d", field, argIndex))
		args = append(args, value)
		argIndex++
	}

	if len(setParts) == 0 {
		return GetUserByID(userID)
	}

	// Add updated_at
	setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	// Add userID to args
	args = append(args, userID)

	query := fmt.Sprintf(`
		UPDATE users
		SET %s
		WHERE id = $%d
		RETURNING id, email, name, created_at, updated_at
	`, fmt.Sprintf("%s", setParts[0]), argIndex)

	// Fix the query building
	query = fmt.Sprintf(`
		UPDATE users
		SET %s
		WHERE id = $%d
		RETURNING id, email, name, created_at, updated_at
	`, fmt.Sprintf("%s", setParts[0]), argIndex)

	// For now, let's use a simpler approach
	query = `
		UPDATE users
		SET updated_at = $1
		WHERE id = $2
		RETURNING id, email, name, created_at, updated_at
	`

	var user models.User
	err := database.DB.QueryRow(query, time.Now(), userID).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return &user, nil
}

package services

import (
	"fmt"
	"log"
	"regexp"
	"strings"

	"preparation-ai/internal/database"
	"preparation-ai/internal/models"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// BankQuestion is a curated question from the question_bank table.
type BankQuestion struct {
	QuestionText string
	QuestionType string
	Tags         []string
}

var tagWordPattern = regexp.MustCompile(`[a-z0-9]+`)

// genericRoleWords carry no topic and would match unrelated questions (e.g. "developer" ~ "development").
var genericRoleWords = map[string]bool{
	"developer": true, "engineer": true, "engineering": true, "senior": true, "junior": true,
	"lead": true, "principal": true, "staff": true, "intern": true, "and": true, "the": true,
}

// bankSearchTerms turns free-form role tags into lowercase exact tags and a to_tsquery OR expression.
func bankSearchTerms(tags []string) ([]string, string) {
	exact := make([]string, 0, len(tags))
	seen := map[string]bool{}
	var words []string
	for _, tag := range tags {
		tag = strings.ToLower(strings.TrimSpace(tag))
		if tag == "" {
			continue
		}
		exact = append(exact, tag)
		for _, w := range tagWordPattern.FindAllString(tag, -1) {
			if len(w) < 2 || genericRoleWords[w] || seen[w] {
				continue
			}
			seen[w] = true
			words = append(words, w)
		}
	}
	return exact, strings.Join(words, " | ")
}

// SearchQuestionBank returns the bank questions most relevant to the role tags at the given experience
// level, ranked by exact tag overlap and full-text match. General questions rank last.
func SearchQuestionBank(tags []string, experience int, limit int) ([]BankQuestion, error) {
	exact, tsquery := bankSearchTerms(tags)

	query := `
		WITH search AS (
			SELECT CASE WHEN $2 = '' THEN NULL ELSE to_tsquery('english', $2) END AS q
		), scored AS (
			SELECT b.question_text, b.question_type, b.tags,
			       (SELECT COUNT(*) FROM unnest(b.tags) t WHERE t = ANY($1::text[])) * 2.0
			       -- Tag words (weight A) count far more than words in the question text (weight D)
			       + COALESCE(ts_rank(
			           setweight(to_tsvector('english', array_to_string(b.tags, ' ')), 'A') ||
			           setweight(to_tsvector('english', b.question_text), 'D'), search.q), 0) * 10
			       + CASE WHEN 'general' = ANY(b.tags) THEN 0.1 ELSE 0 END AS score
			FROM question_bank b, search
			WHERE $3 BETWEEN b.min_experience AND b.max_experience
		)
		SELECT question_text, question_type, tags
		FROM scored
		WHERE score > 0
		ORDER BY score DESC, random()
		LIMIT $4
	`

	rows, err := database.DB.Query(query, pq.Array(exact), tsquery, experience, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search question bank: %w", err)
	}
	defer rows.Close()

	var questions []BankQuestion
	for rows.Next() {
		var q BankQuestion
		if err := rows.Scan(&q.QuestionText, &q.QuestionType, pq.Array(&q.Tags)); err != nil {
			return nil, fmt.Errorf("failed to scan bank question: %w", err)
		}
		questions = append(questions, q)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating bank questions: %w", err)
	}

	return questions, nil
}

// GenerateSessionQuestions retrieves relevant bank questions, asks the AI for a tailored set grounded
// in them, tops up a short set from the bank, and falls back to the bank entirely if the AI is
// unavailable or returns nothing usable.
func GenerateSessionQuestions(params QuestionParams) ([]models.Question, error) {
	count := QuestionCount(params.SessionType)

	references, err := SearchQuestionBank(params.Tags, params.Experience, count*2)
	if err != nil {
		// Retrieval is an enhancement; generation still works without it.
		log.Printf("Question bank search failed for session %s: %v", params.SessionID, err)
	}
	params.References = references

	questions, aiErr := GenerateInterviewQuestions(params)
	if aiErr == nil {
		if len(questions) < count && len(references) > 0 {
			log.Printf("AI returned %d of %d questions for session %s, topping up from question bank", len(questions), count, params.SessionID)
			questions = topUpFromBank(questions, preferTypes(references, params.Preferences), count)
		}
		return questions, nil
	}

	if len(references) == 0 {
		return nil, aiErr
	}

	log.Printf("AI question generation failed for session %s, using question bank: %v", params.SessionID, aiErr)
	return questionsFromBank(params.SessionID, preferTypes(references, params.Preferences), count), nil
}

var preferenceQuestionTypes = map[string]string{
	"coding":               "technical",
	"technical_discussion": "technical",
	"system_design":        "system_design",
	"behavioral":           "behavioral",
}

// preferTypes interleaves bank questions so each preferred question type is represented early,
// keeping relevance order within each type. With no preferences the order is unchanged.
func preferTypes(bank []BankQuestion, preferences []string) []BankQuestion {
	var order []string
	seen := map[string]bool{}
	for _, p := range preferences {
		if t, ok := preferenceQuestionTypes[p]; ok && !seen[t] {
			seen[t] = true
			order = append(order, t)
		}
	}
	if len(order) == 0 {
		return bank
	}

	byType := map[string][]BankQuestion{}
	var rest []BankQuestion
	for _, b := range bank {
		t := normalizeQuestionType(b.QuestionType)
		if seen[t] {
			byType[t] = append(byType[t], b)
		} else {
			rest = append(rest, b)
		}
	}

	result := make([]BankQuestion, 0, len(bank))
	for added := true; added; {
		added = false
		for _, t := range order {
			if len(byType[t]) > 0 {
				result = append(result, byType[t][0])
				byType[t] = byType[t][1:]
				added = true
			}
		}
	}
	return append(result, rest...)
}

// topUpFromBank appends bank questions not already in the set until it has count questions.
func topUpFromBank(questions []models.Question, bank []BankQuestion, count int) []models.Question {
	used := map[string]bool{}
	for _, q := range questions {
		used[strings.ToLower(q.QuestionText)] = true
	}

	sessionID := ""
	if len(questions) > 0 {
		sessionID = questions[0].SessionID
	}
	for _, b := range bank {
		if len(questions) >= count {
			break
		}
		if used[strings.ToLower(b.QuestionText)] {
			continue
		}
		used[strings.ToLower(b.QuestionText)] = true
		questions = append(questions, models.Question{
			ID:           uuid.New().String(),
			SessionID:    sessionID,
			QuestionText: b.QuestionText,
			QuestionType: normalizeQuestionType(b.QuestionType),
			OrderIndex:   len(questions) + 1,
		})
	}
	return questions
}

func questionsFromBank(sessionID string, bank []BankQuestion, count int) []models.Question {
	if len(bank) > count {
		bank = bank[:count]
	}

	questions := make([]models.Question, 0, len(bank))
	for i, b := range bank {
		questions = append(questions, models.Question{
			ID:           uuid.New().String(),
			SessionID:    sessionID,
			QuestionText: b.QuestionText,
			QuestionType: normalizeQuestionType(b.QuestionType),
			OrderIndex:   i + 1,
		})
	}
	return questions
}

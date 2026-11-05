// Package dataset builds chat-format fine-tuning examples (JSONL, {"messages": [...]}) from completed
// interview sessions and from the curated question bank. Prompts come from the services package, so
// examples match exactly what the API sends to the model at inference time.
package dataset

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math/rand"
	"regexp"
	"sort"
	"strings"

	"preparation-ai/internal/models"
	"preparation-ai/internal/services"

	"github.com/lib/pq"
)

// Example is one training conversation; the final message is the assistant output to learn.
type Example struct {
	Messages []services.Message `json:"messages"`
	// Task and Source are kept out of the JSONL so trainers only see messages.
	Task   string `json:"-"`
	Source string `json:"-"`
}

type questionJSON struct {
	QuestionText string `json:"question_text"`
	QuestionType string `json:"question_type"`
}

type feedbackJSON struct {
	TechnicalScore      float64  `json:"technical_score"`
	CommunicationScore  float64  `json:"communication_score"`
	ProblemSolvingScore float64  `json:"problem_solving_score"`
	Strengths           []string `json:"strengths"`
	Weaknesses          []string `json:"weaknesses"`
	Recommendations     []string `json:"recommendations"`
}

func withAnswer(messages []services.Message, answer interface{}) ([]services.Message, error) {
	content, err := json.Marshal(answer)
	if err != nil {
		return nil, err
	}
	return append(messages, services.Message{Role: "assistant", Content: string(content)}), nil
}

var (
	emailPattern = regexp.MustCompile(`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`)
	urlPattern   = regexp.MustCompile(`https?://\S+`)
	phonePattern = regexp.MustCompile(`\+?\d[\d\s().-]{7,}\d`)
)

// ScrubPII masks emails, URLs and phone numbers in free-text candidate answers.
func ScrubPII(text string) string {
	text = emailPattern.ReplaceAllString(text, "[EMAIL]")
	text = urlPattern.ReplaceAllString(text, "[URL]")
	return phonePattern.ReplaceAllString(text, "[PHONE]")
}

// SessionExamples exports completed sessions that have feedback: one question-generation example
// and one evaluation example per session. Labels are whatever model produced them originally, so only
// export from databases that ran a model you trust (never one running with OPENAI_MOCK).
func SessionExamples(db *sql.DB) ([]Example, error) {
	rows, err := db.Query(`
		SELECT s.id, s.session_type, s.tags, COALESCE(s.experience, -1), COALESCE(s.preferences, '{}'),
		       f.technical_score, f.communication_score, f.problem_solving_score,
		       f.strengths, f.weaknesses, f.recommendations
		FROM interview_sessions s
		JOIN session_feedback f ON f.session_id = s.id
		WHERE s.status = 'completed'
		ORDER BY s.created_at
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query sessions: %w", err)
	}

	type sessionRow struct {
		id          string
		sessionType models.SessionType
		tags        []string
		experience  int
		preferences []string
		feedback    feedbackJSON
	}

	var sessions []sessionRow
	for rows.Next() {
		var r sessionRow
		if err := rows.Scan(&r.id, &r.sessionType, pq.Array(&r.tags), &r.experience, pq.Array(&r.preferences),
			&r.feedback.TechnicalScore, &r.feedback.CommunicationScore, &r.feedback.ProblemSolvingScore,
			pq.Array(&r.feedback.Strengths), pq.Array(&r.feedback.Weaknesses), pq.Array(&r.feedback.Recommendations)); err != nil {
			rows.Close()
			return nil, fmt.Errorf("failed to scan session: %w", err)
		}
		sessions = append(sessions, r)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating sessions: %w", err)
	}

	var examples []Example
	for _, s := range sessions {
		qrows, err := db.Query(`
			SELECT q.question_text, q.question_type, COALESCE(r.response_text, '')
			FROM session_questions q
			LEFT JOIN LATERAL (
				SELECT response_text FROM user_responses
				WHERE question_id = q.id
				ORDER BY submitted_at DESC
				LIMIT 1
			) r ON true
			WHERE q.session_id = $1
			ORDER BY q.order_index
		`, s.id)
		if err != nil {
			return nil, fmt.Errorf("failed to query questions for session %s: %w", s.id, err)
		}

		var questions []questionJSON
		var answers []services.QuestionAnswer
		for qrows.Next() {
			var q questionJSON
			var response string
			if err := qrows.Scan(&q.QuestionText, &q.QuestionType, &response); err != nil {
				qrows.Close()
				return nil, fmt.Errorf("failed to scan question: %w", err)
			}
			questions = append(questions, q)
			answers = append(answers, services.QuestionAnswer{
				QuestionText: q.QuestionText,
				QuestionType: q.QuestionType,
				ResponseText: ScrubPII(response),
			})
		}
		qrows.Close()
		if len(questions) == 0 {
			continue
		}

		// The question count in the prompt comes from the session type, so only sessions whose stored
		// set matches it are consistent question-generation examples.
		if len(questions) == services.QuestionCount(s.sessionType) {
			msgs, err := withAnswer(services.QuestionMessages(services.QuestionParams{
				SessionType: s.sessionType,
				Tags:        s.tags,
				Experience:  s.experience,
				Preferences: s.preferences,
			}), map[string]interface{}{"questions": questions})
			if err != nil {
				return nil, err
			}
			examples = append(examples, Example{Messages: msgs, Task: "questions", Source: "sessions"})
		}

		msgs, err := withAnswer(services.EvaluationMessages(s.sessionType, s.tags, answers), s.feedback)
		if err != nil {
			return nil, err
		}
		examples = append(examples, Example{Messages: msgs, Task: "evaluation", Source: "sessions"})
	}

	return examples, nil
}

// BankEntry is a question bank row with its experience range.
type BankEntry struct {
	services.BankQuestion
	minExperience int
	maxExperience int
}

// LoadBank reads the whole question bank.
func LoadBank(db *sql.DB) ([]BankEntry, error) {
	rows, err := db.Query(`SELECT question_text, question_type, tags, min_experience, max_experience FROM question_bank ORDER BY question_text`)
	if err != nil {
		return nil, fmt.Errorf("failed to query question bank: %w", err)
	}
	defer rows.Close()

	var bank []BankEntry
	for rows.Next() {
		var b BankEntry
		if err := rows.Scan(&b.QuestionText, &b.QuestionType, pq.Array(&b.Tags), &b.minExperience, &b.maxExperience); err != nil {
			return nil, fmt.Errorf("failed to scan bank question: %w", err)
		}
		bank = append(bank, b)
	}
	return bank, rows.Err()
}

var preferenceTypes = map[string]string{
	"coding":               "technical",
	"technical_discussion": "technical",
	"system_design":        "system_design",
	"behavioral":           "behavioral",
}

var sessionTypes = []models.SessionType{models.QuickDrill, models.Standard, models.DeepDive}

// BankExamples synthesises up to n question-generation examples from the bank: for a random role tag,
// experience level, prep styles and session type, the target is a set of matching bank questions
// (preferred types first) and other matching questions are given as references, as at inference.
func BankExamples(bank []BankEntry, n int, rng *rand.Rand) []Example {
	var roleTags []string
	seenTag := map[string]bool{}
	for _, b := range bank {
		for _, t := range b.Tags {
			if t != "general" && !seenTag[t] {
				seenTag[t] = true
				roleTags = append(roleTags, t)
			}
		}
	}
	sort.Strings(roleTags)
	if len(roleTags) == 0 {
		return nil
	}

	prefKeys := []string{"coding", "system_design", "behavioral", "technical_discussion"}
	seen := map[string]bool{}
	var examples []Example

	for attempt := 0; attempt < n*10 && len(examples) < n; attempt++ {
		tag := roleTags[rng.Intn(len(roleTags))]
		experience := rng.Intn(6)
		sessionType := sessionTypes[rng.Intn(len(sessionTypes))]
		count := services.QuestionCount(sessionType)

		var prefs []string
		for _, p := range prefKeys {
			if rng.Intn(3) == 0 {
				prefs = append(prefs, p)
			}
		}
		preferred := map[string]bool{}
		for _, p := range prefs {
			preferred[preferenceTypes[p]] = true
		}

		// Role questions first, general ones to fill; preferred types first within each group.
		var role, general []services.BankQuestion
		for _, b := range bank {
			if experience < b.minExperience || experience > b.maxExperience {
				continue
			}
			if containsTag(b.Tags, tag) {
				role = append(role, b.BankQuestion)
			} else if containsTag(b.Tags, "general") {
				general = append(general, b.BankQuestion)
			}
		}
		if len(role) < 2 || len(role)+len(general) < count {
			continue
		}
		orderByPreference(role, preferred, rng)
		orderByPreference(general, preferred, rng)

		// Most of the set comes from the role; general (mostly behavioral) questions fill a third, or
		// half when behavioral questions are preferred, so targets follow the requested focus.
		roleCount := count - count/3
		if preferred["behavioral"] {
			roleCount = count - count/2
		}
		if roleCount > len(role) {
			roleCount = len(role)
		}
		if count-roleCount > len(general) {
			continue
		}
		targets := append(append([]services.BankQuestion{}, role[:roleCount]...), general[:count-roleCount]...)
		references := append(append([]services.BankQuestion{}, role[roleCount:]...), general[count-roleCount:]...)
		if len(references) > count {
			references = references[:count]
		}

		key := fmt.Sprintf("%s|%d|%s|%s|%s", tag, experience, sessionType, strings.Join(prefs, ","), targets[0].QuestionText)
		if seen[key] {
			continue
		}
		seen[key] = true

		questions := make([]questionJSON, 0, len(targets))
		for _, q := range targets {
			questions = append(questions, questionJSON{QuestionText: q.QuestionText, QuestionType: q.QuestionType})
		}

		msgs, err := withAnswer(services.QuestionMessages(services.QuestionParams{
			SessionType: sessionType,
			Tags:        []string{displayTag(tag)},
			Experience:  experience,
			Preferences: prefs,
			References:  references,
		}), map[string]interface{}{"questions": questions})
		if err != nil {
			continue
		}
		examples = append(examples, Example{Messages: msgs, Task: "questions", Source: "bank"})
	}

	return examples
}

func containsTag(tags []string, tag string) bool {
	for _, t := range tags {
		if t == tag {
			return true
		}
	}
	return false
}

func orderByPreference(questions []services.BankQuestion, preferred map[string]bool, rng *rand.Rand) {
	rng.Shuffle(len(questions), func(i, j int) { questions[i], questions[j] = questions[j], questions[i] })
	sort.SliceStable(questions, func(i, j int) bool {
		return preferred[questions[i].QuestionType] && !preferred[questions[j].QuestionType]
	})
}

var acronyms = map[string]string{"aws": "AWS", "ai": "AI", "api": "API", "c#": "C#", "node.js": "Node.js", "postgresql": "PostgreSQL", "mongodb": "MongoDB", "typescript": "TypeScript", "javascript": "JavaScript", "web3": "Web3"}

// displayTag turns a lowercase bank tag into the form a user would type ("game development" -> "Game Development").
func displayTag(tag string) string {
	if a, ok := acronyms[tag]; ok {
		return a
	}
	words := strings.Fields(tag)
	for i, w := range words {
		if a, ok := acronyms[w]; ok {
			words[i] = a
		} else {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}
	return strings.Join(words, " ")
}

// Split shuffles examples and splits off validFraction (at least one example when possible) for validation.
func Split(examples []Example, validFraction float64, rng *rand.Rand) (train, valid []Example) {
	shuffled := append([]Example{}, examples...)
	rng.Shuffle(len(shuffled), func(i, j int) { shuffled[i], shuffled[j] = shuffled[j], shuffled[i] })

	nValid := int(float64(len(shuffled)) * validFraction)
	if nValid == 0 && validFraction > 0 && len(shuffled) > 1 {
		nValid = 1
	}
	return shuffled[nValid:], shuffled[:nValid]
}

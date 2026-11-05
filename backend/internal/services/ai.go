package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"preparation-ai/internal/config"
	"preparation-ai/internal/models"

	"github.com/google/uuid"
)

// aiHTTPClient is the HTTP client used for OpenAI calls; tests may replace it.
var aiHTTPClient = &http.Client{}

type OpenAIRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	Temperature float64   `json:"temperature"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAIResponse struct {
	Choices []Choice `json:"choices"`
	Error   *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

type Choice struct {
	Message Message `json:"message"`
}

// QuestionParams describes the interview the questions are generated for.
type QuestionParams struct {
	SessionID   string
	SessionType models.SessionType
	Tags        []string
	Experience  int
	Preferences []string
}

// QuestionAnswer pairs a question with the candidate's response for evaluation.
type QuestionAnswer struct {
	QuestionText string
	QuestionType string
	ResponseText string
}

const interviewerSystemPrompt = "You are an expert technical interviewer. " +
	"You write realistic interview questions and give fair, specific, actionable feedback. " +
	"Always reply with a single valid JSON object and nothing else."

// experienceLabels mirrors the experience options offered on the warm-up screen.
var experienceLabels = []string{
	"0-1 years (entry level)",
	"1-2 years (junior)",
	"2-3 years (junior+)",
	"3-5 years (mid level)",
	"5-7 years (senior)",
	"7+ years (lead/principal)",
}

// preferenceLabels maps warm-up prep styles to prompt wording.
var preferenceLabels = map[string]string{
	"coding":               "coding and algorithms",
	"system_design":        "system design and architecture",
	"behavioral":           "behavioral (STAR-style) scenarios",
	"technical_discussion": "deep technical discussion of tools and best practices",
}

// QuestionCount returns how many questions a session type should contain.
func QuestionCount(sessionType models.SessionType) int {
	switch sessionType {
	case models.QuickDrill:
		return 4
	case models.DeepDive:
		return 11
	default:
		return 7
	}
}

func GenerateInterviewQuestions(params QuestionParams) ([]models.Question, error) {
	cfg := config.AppConfig
	if cfg == nil {
		return nil, fmt.Errorf("configuration not loaded")
	}

	count := QuestionCount(params.SessionType)
	if cfg.OpenAI.Mock {
		return mockQuestions(params.SessionID, count), nil
	}

	content, err := callOpenAIAPI(interviewerSystemPrompt, buildQuestionPrompt(params, count))
	if err != nil {
		return nil, err
	}

	var parsed struct {
		Questions []struct {
			QuestionText string `json:"question_text"`
			QuestionType string `json:"question_type"`
		} `json:"questions"`
	}
	if err := decodeJSONContent(content, &parsed); err != nil {
		return nil, fmt.Errorf("failed to parse generated questions: %w", err)
	}

	questions := make([]models.Question, 0, len(parsed.Questions))
	for _, q := range parsed.Questions {
		text := strings.TrimSpace(q.QuestionText)
		if text == "" {
			continue
		}
		questions = append(questions, models.Question{
			ID:           uuid.New().String(),
			SessionID:    params.SessionID,
			QuestionText: text,
			QuestionType: normalizeQuestionType(q.QuestionType),
			OrderIndex:   len(questions) + 1,
		})
		if len(questions) == count {
			break
		}
	}

	if len(questions) == 0 {
		return nil, fmt.Errorf("AI returned no usable questions")
	}

	return questions, nil
}

// EvaluateSession scores a completed interview from all of its answers.
func EvaluateSession(sessionType models.SessionType, tags []string, answers []QuestionAnswer) (*models.SessionFeedback, error) {
	cfg := config.AppConfig
	if cfg == nil {
		return nil, fmt.Errorf("configuration not loaded")
	}

	if cfg.OpenAI.Mock {
		return mockFeedback(), nil
	}

	content, err := callOpenAIAPI(interviewerSystemPrompt, buildEvaluationPrompt(sessionType, tags, answers))
	if err != nil {
		return nil, err
	}

	var parsed struct {
		TechnicalScore      float64  `json:"technical_score"`
		CommunicationScore  float64  `json:"communication_score"`
		ProblemSolvingScore float64  `json:"problem_solving_score"`
		Strengths           []string `json:"strengths"`
		Weaknesses          []string `json:"weaknesses"`
		Recommendations     []string `json:"recommendations"`
	}
	if err := decodeJSONContent(content, &parsed); err != nil {
		return nil, fmt.Errorf("failed to parse evaluation: %w", err)
	}

	return &models.SessionFeedback{
		TechnicalScore:      clampScore(parsed.TechnicalScore),
		CommunicationScore:  clampScore(parsed.CommunicationScore),
		ProblemSolvingScore: clampScore(parsed.ProblemSolvingScore),
		Strengths:           nonEmpty(parsed.Strengths),
		Weaknesses:          nonEmpty(parsed.Weaknesses),
		Recommendations:     nonEmpty(parsed.Recommendations),
	}, nil
}

func buildQuestionPrompt(params QuestionParams, count int) string {
	var b strings.Builder

	role := "software engineering"
	if len(params.Tags) > 0 {
		role = strings.Join(params.Tags, ", ")
	}
	fmt.Fprintf(&b, "Write %d interview questions for a candidate preparing for a role involving: %s.\n", count, role)

	if params.Experience >= 0 && params.Experience < len(experienceLabels) {
		fmt.Fprintf(&b, "Candidate experience: %s. Match the difficulty to this level.\n", experienceLabels[params.Experience])
	}

	var focus []string
	for _, p := range params.Preferences {
		if label, ok := preferenceLabels[p]; ok {
			focus = append(focus, label)
		} else if p = strings.TrimSpace(p); p != "" {
			focus = append(focus, p)
		}
	}
	if len(focus) > 0 {
		fmt.Fprintf(&b, "Focus mostly on: %s.\n", strings.Join(focus, "; "))
	} else {
		b.WriteString("Use a balanced mix of technical, system design and behavioral questions.\n")
	}

	b.WriteString("Each question must be answerable in writing within about two minutes, specific to the role, and not repeat another question.\n")
	b.WriteString(`Respond with JSON of the form {"questions":[{"question_text":"...","question_type":"technical|behavioral|system_design"}]}.`)

	return b.String()
}

func buildEvaluationPrompt(sessionType models.SessionType, tags []string, answers []QuestionAnswer) string {
	var b strings.Builder

	role := "software engineering"
	if len(tags) > 0 {
		role = strings.Join(tags, ", ")
	}
	fmt.Fprintf(&b, "Evaluate this %s mock interview for a role involving: %s.\n\n", strings.ReplaceAll(string(sessionType), "_", " "), role)

	for i, a := range answers {
		response := strings.TrimSpace(a.ResponseText)
		if response == "" {
			response = "(no answer given)"
		}
		fmt.Fprintf(&b, "Question %d (%s): %s\nAnswer: %s\n\n", i+1, a.QuestionType, a.QuestionText, response)
	}

	b.WriteString("Score technical depth, communication and problem solving from 0 to 10 (one decimal place). ")
	b.WriteString("Unanswered questions lower the scores. ")
	b.WriteString("List 2-4 specific strengths, 2-4 specific weaknesses and 3-5 concrete recommendations, referring to the answers given.\n")
	b.WriteString(`Respond with JSON of the form {"technical_score":0,"communication_score":0,"problem_solving_score":0,"strengths":["..."],"weaknesses":["..."],"recommendations":["..."]}.`)

	return b.String()
}

func callOpenAIAPI(systemPrompt, userPrompt string) (string, error) {
	cfg := config.AppConfig
	if cfg == nil {
		return "", fmt.Errorf("configuration not loaded")
	}

	if cfg.OpenAI.APIKey == "" && cfg.OpenAI.RequiresAPIKey() {
		return "", fmt.Errorf("OpenAI API key not found")
	}

	request := OpenAIRequest{
		Model: cfg.OpenAI.Model,
		Messages: []Message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		MaxTokens:   cfg.OpenAI.MaxTokens,
		Temperature: 0.7,
	}

	body, err := json.Marshal(request)
	if err != nil {
		return "", fmt.Errorf("failed to encode OpenAI request: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), cfg.OpenAI.Timeout)
	defer cancel()

	url := strings.TrimRight(cfg.OpenAI.BaseURL, "/") + "/chat/completions"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create OpenAI request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if cfg.OpenAI.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+cfg.OpenAI.APIKey)
	}

	resp, err := aiHTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("OpenAI request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read OpenAI response: %w", err)
	}

	var parsed OpenAIResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("OpenAI returned status %d with an unreadable body", resp.StatusCode)
	}

	if resp.StatusCode != http.StatusOK {
		if parsed.Error != nil && parsed.Error.Message != "" {
			return "", fmt.Errorf("OpenAI returned status %d: %s", resp.StatusCode, parsed.Error.Message)
		}
		return "", fmt.Errorf("OpenAI returned status %d", resp.StatusCode)
	}

	if len(parsed.Choices) == 0 || strings.TrimSpace(parsed.Choices[0].Message.Content) == "" {
		return "", fmt.Errorf("OpenAI returned an empty response")
	}

	return parsed.Choices[0].Message.Content, nil
}

// decodeJSONContent parses the JSON object in a model reply, tolerating code fences or surrounding prose.
func decodeJSONContent(content string, v interface{}) error {
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")
	if start == -1 || end < start {
		return fmt.Errorf("no JSON object in response")
	}
	return json.Unmarshal([]byte(content[start:end+1]), v)
}

func normalizeQuestionType(t string) string {
	t = strings.ToLower(strings.TrimSpace(t))
	t = strings.NewReplacer(" ", "_", "-", "_").Replace(t)
	switch t {
	case "behavioral", "behavioural":
		return "behavioral"
	case "system_design", "design", "architecture":
		return "system_design"
	default:
		return "technical"
	}
}

func clampScore(score float64) float64 {
	if score < 0 {
		score = 0
	}
	if score > 10 {
		score = 10
	}
	// session_feedback stores DECIMAL(3,1).
	return float64(int(score*10+0.5)) / 10
}

func nonEmpty(items []string) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		if item = strings.TrimSpace(item); item != "" {
			out = append(out, item)
		}
	}
	return out
}

// mockQuestions returns sample questions when OPENAI_MOCK is enabled.
func mockQuestions(sessionID string, count int) []models.Question {
	samples := []struct{ text, kind string }{
		{"How would you secure a client–server multiplayer architecture in Unity using Netcode?", "technical"},
		{"Explain the difference between client-side and server-side authority in multiplayer games.", "technical"},
		{"How would you handle network synchronization for a real-time multiplayer game?", "system_design"},
		{"Tell me about a time you had to debug a difficult production issue under time pressure.", "behavioral"},
	}

	questions := make([]models.Question, 0, count)
	for i := 0; i < count; i++ {
		s := samples[i%len(samples)]
		questions = append(questions, models.Question{
			ID:           uuid.New().String(),
			SessionID:    sessionID,
			QuestionText: s.text,
			QuestionType: s.kind,
			OrderIndex:   i + 1,
		})
	}
	return questions
}

// mockFeedback returns sample feedback when OPENAI_MOCK is enabled.
func mockFeedback() *models.SessionFeedback {
	return &models.SessionFeedback{
		TechnicalScore:      7.5,
		CommunicationScore:  6.5,
		ProblemSolvingScore: 9.0,
		Strengths:           []string{"Solid understanding of server authority", "Good problem-solving approach"},
		Weaknesses:          []string{"Missed details on synchronization strategies", "Could improve communication clarity"},
		Recommendations:     []string{"Study concurrency in Netcode", "Practice explaining technical concepts"},
	}
}

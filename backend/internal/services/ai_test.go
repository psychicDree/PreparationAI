package services

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"preparation-ai/internal/config"
	"preparation-ai/internal/models"
)

// fakeOpenAI starts a server that answers chat completions with the given content and status.
func fakeOpenAI(t *testing.T, status int, content string, captured *OpenAIRequest) {
	t.Helper()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer test-key" {
			t.Errorf("unexpected Authorization header %q", got)
		}
		if captured != nil {
			if err := json.NewDecoder(r.Body).Decode(captured); err != nil {
				t.Errorf("failed to decode request: %v", err)
			}
		}

		w.WriteHeader(status)
		if status != http.StatusOK {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": map[string]string{"message": content},
			})
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"choices": []map[string]interface{}{
				{"message": map[string]string{"role": "assistant", "content": content}},
			},
		})
	}))
	t.Cleanup(server.Close)

	setTestConfig(t, config.OpenAIConfig{
		APIKey:    "test-key",
		Model:     "test-model",
		MaxTokens: 500,
		BaseURL:   server.URL,
		Timeout:   5 * time.Second,
	})
}

func setTestConfig(t *testing.T, openAI config.OpenAIConfig) {
	t.Helper()
	previous := config.AppConfig
	config.AppConfig = &config.Config{OpenAI: openAI}
	t.Cleanup(func() { config.AppConfig = previous })
}

func TestGenerateInterviewQuestions(t *testing.T) {
	var req OpenAIRequest
	fakeOpenAI(t, http.StatusOK, "```json\n"+`{"questions":[
		{"question_text":"Explain Unity's job system.","question_type":"technical"},
		{"question_text":"  ","question_type":"technical"},
		{"question_text":"Design a matchmaking service.","question_type":"System Design"},
		{"question_text":"Describe a conflict with a teammate.","question_type":"behavioural"},
		{"question_text":"How does garbage collection affect frame time?","question_type":"other"},
		{"question_text":"Extra question beyond the limit.","question_type":"technical"}
	]}`+"\n```", &req)

	questions, err := GenerateInterviewQuestions(QuestionParams{
		SessionID:   "session-1",
		SessionType: models.QuickDrill,
		Tags:        []string{"Unity Developer", "C#"},
		Experience:  3,
		Preferences: []string{"system_design", "behavioral"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(questions) != 4 {
		t.Fatalf("expected 4 questions for a quick drill, got %d", len(questions))
	}

	wantTypes := []string{"technical", "system_design", "behavioral", "technical"}
	for i, q := range questions {
		if q.QuestionType != wantTypes[i] {
			t.Errorf("question %d: expected type %s, got %s", i, wantTypes[i], q.QuestionType)
		}
		if q.OrderIndex != i+1 {
			t.Errorf("question %d: expected order %d, got %d", i, i+1, q.OrderIndex)
		}
		if q.SessionID != "session-1" || len(q.ID) != 36 {
			t.Errorf("question %d: bad ids %q / %q", i, q.SessionID, q.ID)
		}
	}

	if req.Model != "test-model" || req.MaxTokens != 500 {
		t.Errorf("unexpected request model/max tokens: %s / %d", req.Model, req.MaxTokens)
	}
	prompt := req.Messages[len(req.Messages)-1].Content
	for _, want := range []string{"Write 4 interview questions", "Unity Developer, C#", "3-5 years", "system design and architecture"} {
		if !strings.Contains(prompt, want) {
			t.Errorf("prompt missing %q:\n%s", want, prompt)
		}
	}
}

func TestGenerateInterviewQuestionsAPIError(t *testing.T) {
	fakeOpenAI(t, http.StatusUnauthorized, "Incorrect API key provided", nil)

	_, err := GenerateInterviewQuestions(QuestionParams{SessionID: "s", SessionType: models.Standard})
	if err == nil || !strings.Contains(err.Error(), "Incorrect API key provided") {
		t.Fatalf("expected API error to surface, got %v", err)
	}
}

func TestGenerateInterviewQuestionsUnparseable(t *testing.T) {
	fakeOpenAI(t, http.StatusOK, "Sorry, I can't help with that.", nil)

	if _, err := GenerateInterviewQuestions(QuestionParams{SessionID: "s"}); err == nil {
		t.Fatal("expected parse error")
	}
}

func TestEvaluateSession(t *testing.T) {
	var req OpenAIRequest
	fakeOpenAI(t, http.StatusOK, `Here you go: {"technical_score":7.46,"communication_score":12,"problem_solving_score":-1,
		"strengths":["Clear structure",""],"weaknesses":["Missed edge cases"],"recommendations":["Practice STAR answers"]}`, &req)

	feedback, err := EvaluateSession(models.Standard, []string{"Backend Engineer"}, []QuestionAnswer{
		{QuestionText: "What is a mutex?", QuestionType: "technical", ResponseText: "A lock."},
		{QuestionText: "Tell me about a failure.", QuestionType: "behavioral"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if feedback.TechnicalScore != 7.5 || feedback.CommunicationScore != 10 || feedback.ProblemSolvingScore != 0 {
		t.Errorf("scores not clamped/rounded: %+v", feedback)
	}
	if len(feedback.Strengths) != 1 || feedback.Strengths[0] != "Clear structure" {
		t.Errorf("empty strengths not removed: %v", feedback.Strengths)
	}

	prompt := req.Messages[len(req.Messages)-1].Content
	for _, want := range []string{"standard mock interview", "Backend Engineer", "Answer: A lock.", "(no answer given)"} {
		if !strings.Contains(prompt, want) {
			t.Errorf("prompt missing %q:\n%s", want, prompt)
		}
	}
}

func TestLocalEngineWithoutAPIKey(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "" {
			t.Errorf("expected no Authorization header for a keyless local engine, got %q", got)
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"choices": []map[string]interface{}{
				{"message": map[string]string{"role": "assistant", "content": `{"questions":[{"question_text":"Q?","question_type":"technical"}]}`}},
			},
		})
	}))
	t.Cleanup(server.Close)

	setTestConfig(t, config.OpenAIConfig{Model: "llama3.2", BaseURL: server.URL, Timeout: 5 * time.Second})

	questions, err := GenerateInterviewQuestions(QuestionParams{SessionID: "s", SessionType: models.QuickDrill})
	if err != nil || len(questions) != 1 {
		t.Fatalf("expected 1 question from local engine, got %d (%v)", len(questions), err)
	}
}

func TestMockModeSkipsOpenAI(t *testing.T) {
	setTestConfig(t, config.OpenAIConfig{Mock: true, BaseURL: "http://127.0.0.1:1"})

	questions, err := GenerateInterviewQuestions(QuestionParams{SessionID: "s", SessionType: models.DeepDive})
	if err != nil || len(questions) != 11 {
		t.Fatalf("expected 11 mock questions, got %d (%v)", len(questions), err)
	}

	feedback, err := EvaluateSession(models.DeepDive, nil, nil)
	if err != nil || feedback.TechnicalScore == 0 {
		t.Fatalf("expected mock feedback, got %+v (%v)", feedback, err)
	}
}

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

func TestQuestionPromptIncludesReferences(t *testing.T) {
	var req OpenAIRequest
	fakeOpenAI(t, http.StatusOK, `{"questions":[{"question_text":"Q?","question_type":"technical"}]}`, &req)

	_, err := GenerateInterviewQuestions(QuestionParams{
		SessionID:  "s",
		Tags:       []string{"React"},
		References: []BankQuestion{{QuestionText: "What does useEffect's dependency array control?", QuestionType: "technical"}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	prompt := req.Messages[len(req.Messages)-1].Content
	if !strings.Contains(prompt, "- (technical) What does useEffect's dependency array control?") {
		t.Errorf("prompt missing reference question:\n%s", prompt)
	}
}

func TestMockModeUsesQuestionBank(t *testing.T) {
	setTestConfig(t, config.OpenAIConfig{Mock: true})

	bank := []BankQuestion{
		{QuestionText: "Bank 1", QuestionType: "behavioral"},
		{QuestionText: "Bank 2", QuestionType: "System Design"},
	}
	questions, err := GenerateInterviewQuestions(QuestionParams{SessionID: "s", SessionType: models.QuickDrill, References: bank})
	if err != nil || len(questions) != 2 {
		t.Fatalf("expected the 2 bank questions, got %d (%v)", len(questions), err)
	}
	if questions[1].QuestionText != "Bank 2" || questions[1].QuestionType != "system_design" || questions[1].OrderIndex != 2 {
		t.Errorf("unexpected bank question: %+v", questions[1])
	}
}

func TestBankSearchTerms(t *testing.T) {
	exact, query := bankSearchTerms([]string{" Unity Developer ", "C#", "Machine Learning", "unity"})

	wantExact := []string{"unity developer", "c#", "machine learning", "unity"}
	if strings.Join(exact, ",") != strings.Join(wantExact, ",") {
		t.Errorf("exact tags: got %v, want %v", exact, wantExact)
	}
	if query != "unity | machine | learning" {
		t.Errorf("tsquery: got %q", query)
	}

	if _, q := bankSearchTerms([]string{"Senior Engineer"}); q != "" {
		t.Errorf("generic role words should be dropped, got %q", q)
	}
}

func TestJSONModeFallbackAndRetry(t *testing.T) {
	jsonModeUnsupported.Delete("gpt-4")
	t.Cleanup(func() { jsonModeUnsupported.Delete("gpt-4") })

	var calls []bool // whether each request asked for JSON mode
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req OpenAIRequest
		json.NewDecoder(r.Body).Decode(&req)
		calls = append(calls, req.ResponseFormat != nil)

		if req.ResponseFormat != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": map[string]string{"message": "Invalid parameter: 'response_format' of type 'json_object' is not supported with this model."},
			})
			return
		}

		// First plain reply is malformed, the retry is valid.
		content := `{"questions":[{"question_text":"Q?","question_type":"technical"},}]}`
		if len(calls) > 2 {
			content = `{"questions":[{"question_text":"Q?","question_type":"technical"}]}`
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"choices": []map[string]interface{}{{"message": map[string]string{"role": "assistant", "content": content}}},
		})
	}))
	t.Cleanup(server.Close)
	setTestConfig(t, config.OpenAIConfig{APIKey: "k", Model: "gpt-4", BaseURL: server.URL, Timeout: 5 * time.Second})

	questions, err := GenerateInterviewQuestions(QuestionParams{SessionID: "s", SessionType: models.QuickDrill})
	if err != nil || len(questions) != 1 {
		t.Fatalf("expected 1 question after fallback and retry, got %d (%v)", len(questions), err)
	}
	if want := []bool{true, false, false}; len(calls) != 3 || calls[0] != want[0] || calls[1] != want[1] || calls[2] != want[2] {
		t.Errorf("unexpected JSON-mode sequence %v, want %v", calls, want)
	}
	if _, unsupported := jsonModeUnsupported.Load("gpt-4"); !unsupported {
		t.Error("expected JSON mode to be disabled after the endpoint rejected it")
	}
}

func TestJSONModeRequested(t *testing.T) {
	var req OpenAIRequest
	fakeOpenAI(t, http.StatusOK, `{"questions":[{"question_text":"Q?","question_type":"technical"}]}`, &req)

	if _, err := GenerateInterviewQuestions(QuestionParams{SessionID: "s"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if req.ResponseFormat == nil || req.ResponseFormat.Type != "json_object" {
		t.Errorf("expected response_format json_object, got %+v", req.ResponseFormat)
	}
}

func TestPreferTypes(t *testing.T) {
	bank := []BankQuestion{
		{QuestionText: "t1", QuestionType: "technical"},
		{QuestionText: "t2", QuestionType: "technical"},
		{QuestionText: "s1", QuestionType: "system_design"},
		{QuestionText: "b1", QuestionType: "behavioral"},
		{QuestionText: "t3", QuestionType: "technical"},
	}

	got := preferTypes(bank, []string{"behavioral", "coding"})
	var order []string
	for _, q := range got {
		order = append(order, q.QuestionText)
	}
	if strings.Join(order, ",") != "b1,t1,t2,t3,s1" {
		t.Errorf("unexpected order %v", order)
	}

	if same := preferTypes(bank, nil); same[0].QuestionText != "t1" {
		t.Errorf("no preferences should keep order")
	}
}

func TestRetryOnServerError(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if calls == 1 {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{"error": map[string]string{"message": "prediction aborted, token repeat limit reached"}})
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"choices": []map[string]interface{}{{"message": map[string]string{"role": "assistant", "content": `{"questions":[{"question_text":"Q?","question_type":"technical"}]}`}}},
		})
	}))
	t.Cleanup(server.Close)
	setTestConfig(t, config.OpenAIConfig{Model: "llama3.2:3b", BaseURL: server.URL, Timeout: 5 * time.Second})

	if _, err := GenerateInterviewQuestions(QuestionParams{SessionID: "s"}); err != nil || calls != 2 {
		t.Fatalf("expected success on retry after a 500, got calls=%d err=%v", calls, err)
	}
}

func TestTopUpFromBank(t *testing.T) {
	questions := []models.Question{{ID: "1", SessionID: "s", QuestionText: "Already asked?", QuestionType: "technical", OrderIndex: 1}}
	bank := []BankQuestion{
		{QuestionText: "already asked?", QuestionType: "technical"},
		{QuestionText: "Bank A", QuestionType: "behavioral"},
		{QuestionText: "Bank B", QuestionType: "technical"},
		{QuestionText: "Bank C", QuestionType: "technical"},
	}

	got := topUpFromBank(questions, bank, 3)
	if len(got) != 3 || got[1].QuestionText != "Bank A" || got[2].QuestionText != "Bank B" {
		t.Fatalf("unexpected top-up: %+v", got)
	}
	if got[2].OrderIndex != 3 || got[2].SessionID != "s" {
		t.Errorf("topped-up question has wrong order/session: %+v", got[2])
	}
}

func TestOllamaStructuredOutputUnavailable(t *testing.T) {
	const model = "preparation-ai"
	jsonModeUnsupported.Delete(model)
	t.Cleanup(func() { jsonModeUnsupported.Delete(model) })

	var jsonModeCalls, plainCalls int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req OpenAIRequest
		json.NewDecoder(r.Body).Decode(&req)
		if req.ResponseFormat != nil {
			jsonModeCalls++
			w.WriteHeader(http.StatusNotImplemented)
			json.NewEncoder(w).Encode(map[string]interface{}{"error": map[string]string{"message": "structured output is unavailable"}})
			return
		}
		plainCalls++
		json.NewEncoder(w).Encode(map[string]interface{}{
			"choices": []map[string]interface{}{{"message": map[string]string{"role": "assistant", "content": `{"questions":[{"question_text":"Q?","question_type":"technical"}]}`}}},
		})
	}))
	t.Cleanup(server.Close)
	setTestConfig(t, config.OpenAIConfig{Model: model, BaseURL: server.URL, Timeout: 5 * time.Second})

	for i := 0; i < 2; i++ {
		if _, err := GenerateInterviewQuestions(QuestionParams{SessionID: "s"}); err != nil {
			t.Fatalf("call %d: unexpected error: %v", i, err)
		}
	}
	if jsonModeCalls != 1 || plainCalls != 2 {
		t.Errorf("expected one JSON-mode attempt then plain requests, got json=%d plain=%d", jsonModeCalls, plainCalls)
	}
}

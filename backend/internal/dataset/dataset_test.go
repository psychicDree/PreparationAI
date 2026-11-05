package dataset

import (
	"encoding/json"
	"math/rand"
	"strings"
	"testing"

	"preparation-ai/internal/services"
)

func entry(text, kind string, min, max int, tags ...string) BankEntry {
	return BankEntry{
		BankQuestion:  services.BankQuestion{QuestionText: text, QuestionType: kind, Tags: tags},
		minExperience: min,
		maxExperience: max,
	}
}

func testBank() []BankEntry {
	var bank []BankEntry
	for i := 0; i < 14; i++ {
		kind := []string{"technical", "system_design"}[i%2]
		bank = append(bank, entry("Unity question "+string(rune('a'+i)), kind, 0, 5, "unity", "game development"))
	}
	for i := 0; i < 6; i++ {
		bank = append(bank, entry("General question "+string(rune('a'+i)), "behavioral", 0, 5, "general"))
	}
	bank = append(bank, entry("Senior only", "technical", 4, 5, "unity"))
	return bank
}

func TestBankExamples(t *testing.T) {
	examples := BankExamples(testBank(), 30, rand.New(rand.NewSource(1)))
	if len(examples) == 0 {
		t.Fatal("expected examples")
	}

	for _, e := range examples {
		if len(e.Messages) != 3 || e.Messages[2].Role != "assistant" {
			t.Fatalf("unexpected message shape: %+v", e.Messages)
		}
		prompt := e.Messages[1].Content

		var out struct {
			Questions []struct {
				QuestionText string `json:"question_text"`
				QuestionType string `json:"question_type"`
			} `json:"questions"`
		}
		if err := json.Unmarshal([]byte(e.Messages[2].Content), &out); err != nil {
			t.Fatalf("assistant content is not JSON: %v", err)
		}

		var want int
		for _, n := range []int{4, 7, 11} {
			if strings.Contains(prompt, "Write "+itoa(n)+" interview questions") {
				want = n
			}
		}
		if len(out.Questions) != want {
			t.Errorf("prompt asks for %d questions but target has %d", want, len(out.Questions))
		}

		for _, q := range out.Questions {
			if strings.Contains(prompt, ") "+q.QuestionText+"\n") {
				t.Errorf("target question %q also appears as a reference", q.QuestionText)
			}
			if q.QuestionText == "Senior only" && !strings.Contains(prompt, "5-7 years") && !strings.Contains(prompt, "7+ years") {
				t.Errorf("senior-only question used at a junior level:\n%s", prompt)
			}
		}
	}
}

func itoa(n int) string {
	b, _ := json.Marshal(n)
	return string(b)
}

func TestScrubPII(t *testing.T) {
	got := ScrubPII("Mail me at jane.doe@example.com or call +1 (555) 123-4567, see https://example.com/me. Uses O(n log n).")
	for _, leaked := range []string{"jane.doe@example.com", "555", "https://example.com"} {
		if strings.Contains(got, leaked) {
			t.Errorf("PII %q not scrubbed: %s", leaked, got)
		}
	}
	if !strings.Contains(got, "O(n log n)") {
		t.Errorf("non-PII text altered: %s", got)
	}
}

func TestSplit(t *testing.T) {
	examples := make([]Example, 20)
	train, valid := Split(examples, 0.1, rand.New(rand.NewSource(1)))
	if len(train) != 18 || len(valid) != 2 {
		t.Errorf("got %d train / %d valid", len(train), len(valid))
	}

	train, valid = Split(make([]Example, 3), 0.1, rand.New(rand.NewSource(1)))
	if len(valid) != 1 || len(train) != 2 {
		t.Errorf("small sets should still hold out one example, got %d / %d", len(train), len(valid))
	}
}

func TestDisplayTag(t *testing.T) {
	for in, want := range map[string]string{"game development": "Game Development", "aws": "AWS", "node.js": "Node.js", "machine learning": "Machine Learning"} {
		if got := displayTag(in); got != want {
			t.Errorf("displayTag(%q) = %q, want %q", in, got, want)
		}
	}
}

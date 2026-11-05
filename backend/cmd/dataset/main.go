// Command dataset exports fine-tuning data (chat JSONL) for the local interviewer model.
//
//	go run ./cmd/dataset -out ../ml/data -source all
//
// It writes train.jsonl and valid.jsonl in the format mlx-lm and most trainers accept:
// {"messages":[{"role":"system",...},{"role":"user",...},{"role":"assistant",...}]}
package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"os"
	"path/filepath"

	"preparation-ai/internal/config"
	"preparation-ai/internal/database"
	"preparation-ai/internal/dataset"
)

func main() {
	out := flag.String("out", "../ml/data", "output directory for train.jsonl and valid.jsonl (git-ignored by default)")
	source := flag.String("source", "all", "examples to export: sessions, bank or all")
	bankExamples := flag.Int("bank-examples", 400, "number of question-generation examples to synthesise from the question bank")
	validFraction := flag.Float64("valid", 0.1, "fraction of examples held out for validation")
	seed := flag.Int64("seed", 42, "random seed for sampling and splitting")
	flag.Parse()

	if *source != "sessions" && *source != "bank" && *source != "all" {
		log.Fatalf("invalid -source %q: use sessions, bank or all", *source)
	}

	config.Load()
	db, err := database.Connect()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	rng := rand.New(rand.NewSource(*seed))
	var examples []dataset.Example

	if *source == "sessions" || *source == "all" {
		sessionExamples, err := dataset.SessionExamples(db)
		if err != nil {
			log.Fatal(err)
		}
		examples = append(examples, sessionExamples...)
	}

	if *source == "bank" || *source == "all" {
		bank, err := dataset.LoadBank(db)
		if err != nil {
			log.Fatal(err)
		}
		examples = append(examples, dataset.BankExamples(bank, *bankExamples, rng)...)
	}

	if len(examples) == 0 {
		log.Fatal("no examples to export: complete some sessions or seed database/question_bank_seed.sql")
	}

	train, valid := dataset.Split(examples, *validFraction, rng)

	if err := os.MkdirAll(*out, 0o755); err != nil {
		log.Fatal(err)
	}
	for name, set := range map[string][]dataset.Example{"train.jsonl": train, "valid.jsonl": valid} {
		if err := writeJSONL(filepath.Join(*out, name), set); err != nil {
			log.Fatal(err)
		}
	}

	counts := map[string]int{}
	for _, e := range examples {
		counts[e.Source+"/"+e.Task]++
	}
	fmt.Printf("Wrote %d train and %d valid examples to %s\n", len(train), len(valid), *out)
	for k, v := range counts {
		fmt.Printf("  %-22s %d\n", k, v)
	}
}

func writeJSONL(path string, examples []dataset.Example) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	w := bufio.NewWriter(f)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	for _, e := range examples {
		if err := enc.Encode(e); err != nil {
			return err
		}
	}
	return w.Flush()
}

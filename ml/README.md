# Local interviewer model

Tools for running PreparationAI on a local model and fine-tuning a small one for its prompts.

## Run on a local engine (no fine-tuning)

The backend speaks the OpenAI Chat Completions API, so any OpenAI-compatible engine works. With [Ollama](https://ollama.com):

```bash
ollama pull llama3.2:3b
# backend .env
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3.2:3b
OPENAI_TIMEOUT=240s
OPENAI_MAX_TOKENS=1500
```

No API key is needed for non-OpenAI hosts. From Docker Compose use `http://host.docker.internal:11434/v1`.

Small models are less reliable, so the backend:
- requests JSON mode (`response_format: json_object`) and drops it automatically for models that reject it;
- retries once on malformed JSON or a server error (Ollama aborts runaway generations with a 500);
- grounds question generation in the **question bank** (`database/question_bank_seed.sql`): relevant questions are retrieved by tag and full-text match and added to the prompt. If the model returns too few questions, the set is topped up from the bank. If it fails entirely, the bank questions are used.

## Dataset

`backend/cmd/dataset` exports chat-format JSONL (`{"messages": [...]}`), built with the same prompt builders the API uses:

```bash
cd backend
go run ./cmd/dataset -out ../ml/data -source all   # sessions, bank or all
```

- **bank**: synthetic question-generation examples. Each one picks a role tag, experience level, prep styles and session type. The target is a matching set of bank questions (preferred types first), and other matching questions appear as references, as they do at inference.
- **sessions**: completed sessions with feedback, giving one question-generation example and one evaluation example each. Emails, URLs and phone numbers in answers are masked. The labels are whatever model produced them, so only export from a database that ran a model you trust. Never export from one that ran with `OPENAI_MOCK`.

Only 91 questions are in the bank, so bank examples overlap heavily and the validation split shares questions with training. That split measures format and instruction following, not generalisation to new questions.

## Fine-tune (Apple Silicon, MLX)

```bash
cd ml
DB_HOST=localhost DB_PASSWORD=password ./train.sh          # export, train, fuse, ollama create
./train.sh train   # or run single steps: export | train | fuse | ollama
```

`train.sh` creates a Python 3.12 venv with [uv](https://docs.astral.sh/uv/), then:
1. trains a LoRA adapter on `mlx-community/Llama-3.2-1B-Instruct-4bit` (QLoRA, config in `lora_config.yaml`, sized for 8 GB of RAM; only the assistant replies are trained);
2. fuses and de-quantizes the adapter into `fused/`;
3. imports it into Ollama as `preparation-ai` (`QUANTIZE=int8` by default; older Ollama versions use `q8_0`/`q4_K_M`), reusing the Llama 3 chat template from `llama3.2:3b`.

Then set `OPENAI_MODEL=preparation-ai`.

## Evaluate

```bash
python3 eval.py llama3.2:1b preparation-ai --limit 40
```

This scores each model on `data/valid.jsonl`: whether the JSON is valid, the question count is correct and the question types are allowed, plus valid scores for evaluation examples.

## Results so far (M1, 8 GB, 2026-11-05)

Trained on the 400 bank examples (600 iterations, about 45 minutes). Validation loss fell from 2.01 to 0.098. On 20 held-out examples:

| Model | Valid JSON | Right question count | Allowed types | Avg time |
|---|---|---|---|---|
| llama3.2:1b (base) | 18/20 | 4/18 | 16/18 | 9.0s |
| llama3.2:3b | 20/20 | 7/20 | 17/20 | 19.1s |
| preparation-ai (1B fine-tuned, int8) | 20/20 | 11/20 | 20/20 | 5.8s |

In real sessions through the API, the fine-tuned model:
- produced correctly sized question sets in 5–9 s, but copied them verbatim from the bank. With only 91 bank questions it memorised them instead of learning to write new ones;
- failed every evaluation (malformed JSON). Evaluation was not in its training data, and Ollama offers no JSON mode for models imported from safetensors ("structured output is unavailable"; the backend falls back to plain requests).

**Recommendation:** use `llama3.2:3b` (or larger) as the local model for now. The 3B model wrote fresh, role-specific questions and usable feedback in every test run (questions in 8–32 s, feedback in 8–15 s).

**Next step to make the fine-tune worthwhile:** distil from a stronger teacher. Run many sessions with `llama3.2:3b` or a hosted model as `OPENAI_MODEL`, then export with `-source all`. That adds fresh questions and evaluation examples alongside the bank. A larger, more varied bank also helps.

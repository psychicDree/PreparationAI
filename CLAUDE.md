# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

PreparationAI is an AI-driven mock interview platform. It is a two-service monorepo:

- `backend/` — Go (Fiber v2) REST + WebSocket API, talking to PostgreSQL.
- `frontend/` — React + TypeScript SPA built with Vite, served by Nginx in production.

The two services are wired together for local development via the root `docker-compose.yml`.

## Common Commands

### Full stack (Docker Compose)
```bash
docker-compose up -d            # Start postgres, redis, backend, frontend
docker-compose logs -f backend  # Tail a single service's logs
docker-compose down             # Stop everything

./scripts/init.sh               # Automated first-time setup (generates JWT secret, .env)
```
Local URLs: frontend `http://localhost:5173`, backend `http://localhost:8080`, health `http://localhost:8080/api/v1/health`, Postgres `5432`, Redis `6379`. On first boot Postgres auto-applies `database/schema.sql` then `database/seed.sql` via the docker-entrypoint volume mounts.

### Backend (`cd backend`)
```bash
go run cmd/main.go              # Run the API server locally
go build -o main cmd/main.go    # Build the binary (matches CI)
go test -v -race ./...          # Run all tests with the race detector
go test -v -run TestName ./internal/services   # Run a single test / package
go test -cover ./...            # Coverage
go vet ./...                    # Static analysis (CI gate)
gofmt -s -l .                   # List unformatted files; CI FAILS if this is non-empty
gofmt -s -w .                   # Auto-format before committing
```

### Frontend (`cd frontend`)
```bash
npm ci          # Install (use ci, not install, to match CI/lockfile)
npm run dev     # Vite dev server on :5173
npm run lint    # ESLint (CI gate)
npx tsc --noEmit  # Type-check only (separate CI gate from build)
npm run build   # tsc -b && vite build — production bundle into dist/
```

## CI Expectations

`.github/workflows/ci.yml` runs on PRs to `main` and pushes to `main`/`develop`. Before pushing, make sure these pass locally, because they are hard gates:
- Frontend: `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Backend: `go vet ./...`, **`gofmt -s -l .` must report nothing**, `go test -v -race ./...`.

The backend test job spins up `postgres:15-alpine` and `redis:7-alpine` services and injects DB/Redis/JWT/OpenAI/Stripe env vars — tests should read configuration from env, never hardcode connection details. Docker build + multi-cloud deploy stages only run on push to `main`.

## Architecture

### Backend request flow
Entry point is `backend/cmd/main.go`, which:
1. Loads config (`internal/config`), connects to the DB (`internal/database`), and constructs the Fiber app with a global JSON error handler.
2. Mounts all routes under the `/api/v1` group. Public routes (`/health`, `/auth/register`, `/auth/login`, `/subscription-plans`) sit outside auth; everything else is behind the `/` group guarded by `middleware.Protected()` (JWT). WebSockets are mounted separately at `/ws`.
3. Starts the WebSocket manager goroutine (`handlers.GetWebSocketManager().Start()`) before `app.Listen`.

**`main.go` is the single source of truth for the route table.** When adding an endpoint, register it here and place it under the correct group (public vs. `protected`).

Layering inside `internal/`:
- `handlers/` — Fiber handlers; parse/validate requests, call services, shape responses. One file per domain (`auth`, `session`, `payment`, `subscription`, `websocket`).
- `services/` — business logic (`auth`, `user`, `session`, `payment`, `subscription`, `ai`).
- `models/` — plain structs with JSON tags (`user`, `session`, `subscription`).
- `database/` — connection pooling only. **There is no ORM**: data access uses the standard `database/sql` with the `lib/pq` driver and parameterized queries. Follow that pattern (no GORM/sqlx).
- `config/` — env-driven config with typed sub-structs and sensible defaults; `Config.Validate()` enforces required keys (OpenAI + Stripe) and rejects the default JWT secret in production. Config is cached in the package-level `config.AppConfig`.

Auth uses JWTs (`github.com/golang-jwt/jwt/v4` + `gofiber/jwt`); logout relies on a `token_blacklist` table rather than stateless expiry alone.

Social sign-in (Google, GitHub, LinkedIn, Apple) goes through Supabase Auth: the frontend (`src/utils/supabase.ts`, `pages/AuthCallbackPage.tsx`) runs the PKCE OAuth flow and posts the Supabase access token to the public `POST /api/v1/auth/supabase`, which verifies it with Supabase (`services/supabase_auth.go`, `GET /auth/v1/user`), links or creates the user by Supabase ID or verified email (`FindOrCreateSupabaseUser`), and returns the app's own JWT. Social-only users have `password_hash` NULL. Backend env: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (optional; endpoint returns 503 without them).

### Frontend structure
- `src/App.tsx` defines the router and the 7-screen flow: Landing → Onboarding → RoleSetup → Warmup → Payment → Interview → Feedback, plus Dashboard and Pricing. `ProtectedRoute` is currently a pass-through (guest sessions are allowed; pages handle their own gating).
- `src/store/useAppStore.ts` — Zustand store with `persist` middleware; it is the single global store. It only persists user data when authenticated and always persists the current session to preserve the onboarding flow, and has a `migrate` hook that clears stale persisted state on version bumps. Prefer the exported selector hooks (`useUser`, `useCurrentSession`, `useQuestions`, etc.) over reading raw state.
- `src/services/api.ts` — single `ApiService` (axios) instance. A request interceptor attaches the `auth_token` from `localStorage`; a response interceptor clears the token and redirects on `401`. Route all HTTP through this service.
- `src/services/websocket.ts` — real-time interview channel.
- `src/config/index.ts` — centralizes all `VITE_*` env vars into a typed `config` object with feature flags; `validateConfig()` throws in production if required keys (e.g. Stripe when payments enabled) are missing. Read env through this module, not `import.meta.env` directly.
- `src/types/index.ts` — shared TypeScript types that mirror the backend models; keep these in sync when changing API contracts.

### Data model
`database/schema.sql` defines: `users`, `user_profiles`, `interview_sessions`, `session_questions`, `user_responses`, `session_feedback`, `question_bank`, `subscription_plans`, `user_subscriptions`, `token_blacklist`. Seed data lives in `seed.sql`, `subscription_plans_seed.sql` and `question_bank_seed.sql` (curated interview questions, re-runnable). There is no migration tool wired in for local dev — schema changes are applied by editing `schema.sql` (re-applied on a fresh DB volume); for existing databases add an idempotent script under `database/migrations/`. `.github/workflows/migrate.yml` handles managed migrations for deployed environments.

## Important Notes & Gotchas

- **AI integration** lives in `internal/services/ai.go` and calls the OpenAI Chat Completions API over plain `net/http` (no SDK). `POST /sessions/:id/questions` generates questions once per session (count by session type: 4/7/11) and stores them; repeat calls return the stored set. `POST /sessions/:id/feedback` evaluates all answers in one call, stores the feedback and marks the session completed; it is also idempotent. Inserts lock the session row so concurrent calls can't duplicate questions/feedback. Env: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_MAX_TOKENS`, `OPENAI_BASE_URL`, `OPENAI_TIMEOUT`, and `OPENAI_MOCK=true` for sample data without a key (rejected in production). `OPENAI_BASE_URL` can point at a local OpenAI-compatible engine (Ollama `http://localhost:11434/v1`, LM Studio `http://localhost:1234/v1`); the API key is only required when the host is `api.openai.com`. Requests use JSON mode (auto-disabled if the endpoint rejects `response_format`) and retry once on malformed JSON or a 5xx. Tests in `ai_test.go` use an `httptest` fake server — never hit the real API in tests.
- **Question bank / retrieval** (`internal/services/question_bank.go`): `GenerateSessionQuestions` retrieves relevant `question_bank` rows (tag overlap + Postgres full-text rank, filtered by experience) and passes them to the prompt as references; short AI sets are topped up from them and they are the fallback if the AI fails. `ai.go` stays DB-free; prompt builders (`QuestionMessages`, `EvaluationMessages`) are shared with the dataset exporter so training data matches inference.
- **Dataset + fine-tuning**: `backend/cmd/dataset` exports chat JSONL from completed sessions and the bank; `ml/` holds the MLX LoRA pipeline (`train.sh`), `eval.py` and docs. Generated `ml/data`, `adapters`, `fused`, `.venv` are git-ignored.
- **Payments** are one-time Stripe PaymentIntents per session, priced on the server from the session type (`GetSessionPricing`). `POST /payments/create-intent` takes `session_id` + `session_type` (type can change only while unpaid), and `confirm` plus the webhook verify status, session/user metadata and the exact amount before `MarkSessionPaid`, which locks the type. The frontend checkout (`pages/PaymentPage.tsx`, Stripe Payment Element via `utils/stripe.ts`) runs only when `VITE_ENABLE_PAYMENTS` is true and a publishable key is set; `PAYMENTS_REQUIRED=true` makes question generation return 402 for unpaid sessions (off by default). See `docs/DEPLOYMENT.md` section 5a.
- **Postgres arrays** (`TEXT[]` columns such as `tags`, `strengths`) must go through `pq.Array(...)` when writing and scanning; `lib/pq` does not convert `[]string` on its own.
- Guest sessions (`temp-session`, not signed in) can't call protected AI endpoints, so the interview and feedback pages show demo content with a sign-in prompt.
- **Redis is provisioned but not yet consumed by Go code.** It's defined in `config`, docker-compose, and CI, but there's no Redis client in `go.mod` — don't assume caching/session storage in Redis exists yet.
- **README drift:** the README says React 18 and Go 1.21+, but `package.json` pins React 19 and `go.mod` targets Go 1.25.1. The health endpoint is `/api/v1/health` (not `/health`). Trust the code over the README for versions and routes.
- **CORS allowed origins are hardcoded in `main.go`** (`https://yourdomain.com` placeholder for production) — update there, not via env.
- Numerous `.env*` files exist (`env.example`, `env.production`, `env.staging`, and `.env.backup.*`). `env.example` is the template; copy to `.env` for local work. Never commit real secrets.

## Deployment

`scripts/deploy.sh -e <staging|production> -p <aws|gcp|azure|k8s>` drives deploys. Infra-as-code: `infrastructure/aws/terraform/` (Terraform), `k8s/preparation-ai.yaml` (Kubernetes manifest), and per-cloud GitHub Actions workflows (`deploy-aws.yml`, `deploy-gcp.yml`, `deploy-azure.yml`). Production compose is `docker-compose.prod.yml` with `nginx.conf` as the edge.

The production frontend is served by the `preparationai` Cloudflare Worker (static assets), built by Cloudflare's Git integration from the root `wrangler.jsonc` (`assets.directory: ./frontend/dist`, SPA fallback). Build command and `VITE_*` build variables live in the Worker's dashboard settings, not in GitHub. See `docs/DEPLOYMENT.md`.

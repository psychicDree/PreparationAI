# Production Readiness Roadmap

Status of PreparationAI on the path to production. The backend scaffolding
(auth, schema, routing, Docker, CI, multi-cloud deploy) is in place, but the
core AI generation is currently mocked and several security/correctness gaps
remain. Items are grouped by priority.

Each item notes the concrete code location of the current stub/gap where one
exists.

## P0 — Core product (LLM integration)

All of the following live in `backend/internal/services/ai.go`, which currently
returns hardcoded mock data:

- [ ] **Real OpenAI integration.** `callOpenAI` returns `"Mock AI response"`; there is no HTTP client to the API. Add it with timeouts, retries/backoff, and error handling.
- [ ] **Generate tailored prep plans + questions from a job description.** `GenerateInterviewQuestions` returns three hardcoded questions regardless of input. Drive prompts from JD/role/skills/experience and use structured outputs (JSON schema / tool-calling) for reliable parsing.
- [ ] **Response evaluation/scoring.** `EvaluateResponse` returns mock feedback. Define a scoring rubric (technical depth, communication, problem-solving) and have the model fill it.
- [ ] **Wire AI into the request path.** `handlers/session.go` still has `// TODO: Generate questions using AI service`.
- [ ] **Stream generation** (SSE or the existing WebSocket) for questions and feedback.
- [ ] **Cost/safety controls:** current model selection, max-token caps, content caching, and prompt-injection mitigation for user-supplied JDs/answers.
- [ ] **Provider abstraction** so the model is not hardcoded to OpenAI.

## P0 — Security & correctness blockers

- [ ] **Authenticate the WebSocket endpoint.** `/ws` is mounted outside the `Protected()` group and reads `user_id` from a query param (`handlers/websocket.go`). Verify the JWT on upgrade.
- [ ] **Attribute payments to the real user.** `handlers/payment.go` hardcodes `userID := "user-id-placeholder"` instead of reading `c.Locals("userID")`.
- [ ] **Implement payment confirmation + Stripe webhooks.** `services.ConfirmPayment` is a no-op. Add a webhook handler that consumes `STRIPE_WEBHOOK_SECRET`; never trust client-side confirmation alone.
- [ ] **Remove the JWT fallback secret.** `middleware/auth.go` falls back to `"your-secret-key"` when config is nil; fail closed. Delete dead `ExtractUserID` returning `"user-id-placeholder"`.
- [ ] **Audit & purge committed secrets.** Remove `.env.backup.*` from the repo, gitignore the pattern, and scrub history if they contain real keys.
- [ ] **Add rate limiting, security headers, panic recovery.** None exist today. Add Fiber `limiter`, `helmet`, and `recover` middleware.
- [ ] **Drive CORS origins from env.** Hardcoded to `https://yourdomain.com` in `main.go`.

## P1 — Testing & reliability

- [ ] **Add tests.** No `*_test.go` files exist and `package.json` has no `test` script. Add Go unit tests (services) and a frontend runner (Vitest).
- [ ] **Real frontend route protection.** `ProtectedRoute` in `App.tsx` is a pass-through.
- [ ] **Readiness/liveness probes.** Only `/api/v1/health` exists; add DB (and Redis, if kept) checks.
- [ ] **Graceful shutdown.** `main.go` ends with `log.Fatal(app.Listen(...))`; handle signals and close the DB pool.
- [ ] **DB migration tooling.** Adopt golang-migrate/goose for parity with the deployed `migrate.yml` workflow.

## P2 — Operations & cleanup

- [ ] **Decide on Redis.** Provisioned in compose/CI/config but unused in Go code. Wire it (caching, rate-limit store, token-blacklist cache) or remove it.
- [ ] **Structured logging + observability.** Request IDs, JSON logs, error tracking, basic metrics.
- [ ] **Audio recording/transcription.** Advertised in the README but not implemented; scope in or drop.
- [ ] **Fix README drift.** Correct React/Go versions, endpoints, and unbuilt feature claims.

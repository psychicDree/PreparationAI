# Deployment: Supabase (database) + Cloudflare (frontend & edge)

This describes the target production topology and the manual steps that must be
done outside the repository (account setup, secrets, DNS). The in-repo code and
config changes that support it are already committed.

```
Browser ──► Cloudflare (Workers + WAF/rate-limit/DDoS)
               │
               ├──► Static React app (Cloudflare Worker static assets)
               │
               └──► /api  ──► Go backend (container host) ──► Supabase Postgres
                                              │
        Frontend ──► Supabase JS client ──────┘ (auth/realtime/storage, optional)
```

## 1. Database — Supabase Postgres

The Go backend already speaks Postgres, so this is a connection-string change.

1. In the Supabase dashboard: **Project Settings → Database → Connection string**.
   - Use the **Transaction pooler** string (port `6543`) for serverless/edge or
     many short-lived connections; use the **direct** string (port `5432`) for a
     long-lived container.
2. Set `DATABASE_URL` in the backend environment (it takes precedence over the
   discrete `DB_*` vars — see `config.GetDatabaseDSN`). Keep `sslmode=require`.
   ```
   DATABASE_URL=postgresql://postgres:[DB-PASSWORD]@db.<ref>.supabase.co:5432/postgres?sslmode=require
   ```
3. Apply the schema and seeds to Supabase (via the SQL Editor or `psql`):
   ```
   psql "$DATABASE_URL" -f database/schema.sql
   psql "$DATABASE_URL" -f database/seed.sql
   psql "$DATABASE_URL" -f database/subscription_plans_seed.sql
   ```
   > A proper migration tool (golang-migrate/goose) is tracked separately in the
   > roadmap; until then the schema is applied manually.

> **Note on RLS:** the backend connects with the Postgres role and is the trusted
> data layer, so Row-Level Security is optional for backend access. If the
> frontend Supabase client (below) reads/writes tables directly, you **must**
> enable RLS and write policies, or those tables are world-readable with the
> anon key.

## 2. Frontend client — Supabase JS

Already wired in the repo:
- `@supabase/supabase-js` is installed.
- `src/services/supabase.ts` exposes a lazily-created singleton via `getSupabase()`.
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are read through
  `src/config/index.ts`. Set them in `frontend/.env.local` for local dev and as
  build variables on the Cloudflare Worker for production. The publishable (anon) key is
  safe to ship to the browser; data is protected by RLS, not key secrecy.

## 3. Frontend hosting — Cloudflare Worker (static assets)

The frontend is served by the `preparationai` Worker, which is connected to this
repo with Cloudflare's Git integration (Workers Builds). Cloudflare builds and
deploys on every push to `main`. There is no GitHub Actions workflow for it and
no Cloudflare secrets in GitHub.

The root `wrangler.jsonc` configures it:
- `name` must match the Worker's name in the dashboard (`preparationai`).
- `assets.directory` is `./frontend/dist`, the Vite build output.
- `assets.not_found_handling: "single-page-application"` serves `index.html`
  for unknown paths, so deep links like `/interview/123` reach React Router.

In the dashboard (**Workers & Pages → preparationai → Settings → Build**):
1. **Build command:** `cd frontend && npm ci && npm run build`
2. **Deploy command:** `npx wrangler deploy` (the default)
3. **Root directory:** leave as the repo root, where `wrangler.jsonc` lives.
4. **Variables and secrets:** add the `VITE_*` values from section A as
   **Variable** entries. They are read at build time and baked into the bundle.
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are not needed here: the
   build authenticates with the build API token selected on the same page.

## 3a. Custom domain — jobpreparation.online

1. Add the domain to Cloudflare (it must be on a Cloudflare-managed zone).
2. In the `preparationai` Worker → **Settings → Domains & Routes**, add
   `jobpreparation.online` as a custom domain (and `www` if desired).
   Cloudflare provisions the certificate.
3. Host the **Go backend (API + WebSocket) separately** — Workers cannot
   run the Fiber server. Use a container host (Fly.io / Railway / Render / a VM)
   and point a subdomain at it, e.g. `api.jobpreparation.online`. Proxy it
   through Cloudflare for WAF/TLS. A ready-to-use **Fly.io config lives at
   `backend/fly.toml`** (builds from the existing Dockerfile, health-checks
   `/api/v1/health`, keeps one machine warm for WebSockets); deploy with
   `fly deploy` from `backend/` after setting secrets.
4. Set the frontend env for production:
   - `VITE_API_URL=https://api.jobpreparation.online/api/v1`
   - `VITE_WS_URL=wss://api.jobpreparation.online/ws`
   and the backend `CORS_ALLOWED_ORIGINS=https://jobpreparation.online`.

The frontend opens the WebSocket (`wss://.../ws?token=<jwt>&session_id=<id>`)
only after login, when a user starts a preparation session — see
`frontend/src/pages/InterviewDashboard.tsx`. The backend authenticates the
upgrade with the JWT, so `VITE_WS_URL` must be reachable from the browser and
share the auth domain.

## 4. Edge security — Cloudflare

- Put the API hostname behind Cloudflare (proxied DNS) and enable the **WAF**.
- Add **rate-limiting rules** for `/api/v1/auth/*` and the AI-generation
  endpoints (`/api/v1/sessions/:id/questions`). This complements, but does not
  replace, the in-app rate limiting tracked in the roadmap.
- Optionally use **Cloudflare Hyperdrive** in front of Supabase Postgres to pool
  and accelerate connections from edge compute.

## 5. Object storage (optional) — audio recordings

For the audio-response feature, store recordings in **Cloudflare R2** or
**Supabase Storage** and persist only the object URL in `user_responses.audio_url`.

## Required secrets & variables checklist

Two destinations. **Only the `VITE_*` values go on Cloudflare** — they are
public, build-time values baked into the JS bundle. The real secrets go on the
backend host (Fly.io), never on Cloudflare/the frontend.

### A. Cloudflare Worker `preparationai` → Settings → Build → Variables and secrets (frontend, public; add as **Variable**)

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://api.jobpreparation.online/api/v1` |
| `VITE_WS_URL` | `wss://api.jobpreparation.online/ws` |
| `VITE_SUPABASE_URL` | `https://dpfqcrucpbhmqmdjeatg.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_...` key (Supabase → API) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` (Stripe → API keys) |
| `VITE_NODE_ENV` | `production` |
| `VITE_DEBUG` | `false` |

Optional (defaults are fine): `VITE_ENABLE_AUDIO_RECORDING`,
`VITE_ENABLE_PAYMENTS`, `VITE_ENABLE_ANALYTICS`, `VITE_API_TIMEOUT`,
`VITE_THEME`, `VITE_LANGUAGE`, `VITE_TIMEZONE`. `VITE_*` values are compile-time
— changing them requires a new build (push to `main`, or retry the latest
build in the Worker's **Deployments** tab).

### B. Backend host (Fly.io) → `fly secrets set` (real secrets — never on Cloudflare)

| Secret | Source / notes |
|--------|----------------|
| `DATABASE_URL` | Supabase → Settings → Database (the DB **password**, not the anon key); keep `sslmode=require` |
| `JWT_SECRET` | a long random string (e.g. `openssl rand -base64 48`) |
| `OPENAI_API_KEY` | OpenAI dashboard — required or AI question/feedback generation fails |
| `STRIPE_SECRET_KEY` | Stripe — required to boot |
| `STRIPE_PUBLISHABLE_KEY` | Stripe — required to boot |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook pointed at `/api/v1/payments/webhook` |
| `CORS_ALLOWED_ORIGINS` | `https://jobpreparation.online` (must match the frontend's domain) |
| `NODE_ENV` | `production` |
| `OPENAI_MODEL` | optional, defaults to `gpt-4o` |

`PORT` / `SERVER_HOST` are set in `backend/fly.toml`. The discrete `DB_*` vars
are unnecessary when `DATABASE_URL` is set.

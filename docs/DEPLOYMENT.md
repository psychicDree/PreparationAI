# Deployment: Supabase (database) + Cloudflare (frontend & edge)

This describes the target production topology and the manual steps that must be
done outside the repository (account setup, secrets, DNS). The in-repo code and
config changes that support it are already committed.

```
Browser ──► Cloudflare (Pages + WAF/rate-limit/DDoS)
               │
               ├──► Static React app (Cloudflare Pages)
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
  `src/config/index.ts`. Set them in `frontend/.env.local` for local dev and in
  the Cloudflare Pages project for production. The publishable (anon) key is
  safe to ship to the browser; data is protected by RLS, not key secrecy.

## 3. Frontend hosting — Cloudflare Pages

1. Create a Pages project connected to this repo.
2. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `frontend`
3. Add the `VITE_*` environment variables in the Pages project (API URL, WS URL,
   Stripe publishable key, Supabase URL + publishable key).
4. SPA routing is handled by `frontend/public/_redirects`
   (`/* /index.html 200`), so deep links resolve to the React Router app.

There are two deployment models — pick one:

- **Git integration (simplest):** connect the repo in the Cloudflare dashboard
  with the build settings above; Cloudflare builds and deploys on every push.
  No workflow or secrets needed.
- **CI Direct Upload:** use the included
  `.github/workflows/deploy-cloudflare-pages.yml`, which builds and runs
  `wrangler pages deploy`. It requires a Pages project named `preparationai`
  plus these repo settings:
  - **Secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
  - **Variables:** `VITE_API_URL`, `VITE_WS_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`,
    `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

  `frontend/wrangler.toml` sets the project name and `dist` output directory.

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

## Required secrets checklist

| Where | Variable | Source |
|-------|----------|--------|
| Backend | `DATABASE_URL` | Supabase → Database → Connection string |
| Backend | `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `JWT_SECRET` | respective dashboards |
| Pages   | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → API |
| Pages   | `VITE_API_URL`, `VITE_WS_URL`, `VITE_STRIPE_PUBLISHABLE_KEY` | your deploy |

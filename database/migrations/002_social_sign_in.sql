-- Social sign-in (Google, GitHub, LinkedIn, Apple) through Supabase Auth.
-- Idempotent: safe to run more than once. Fresh databases get all of this from schema.sql.
-- Apply with: psql "$DATABASE_URL" -f database/migrations/002_social_sign_in.sql

-- Accounts created through social sign-in have no password.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- The Supabase Auth user linked to this account.
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_user_id VARCHAR(255) UNIQUE;

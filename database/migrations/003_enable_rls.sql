-- Enable Row-Level Security on every app table (no policies = no Data API access).
-- Needed on Supabase, where the public schema is exposed to the publishable key.
-- The Go backend connects as the table owner and bypasses RLS.
-- Idempotent: safe to run more than once. Fresh databases get this from schema.sql.
-- Apply with: psql "$DATABASE_URL" -f database/migrations/003_enable_rls.sql

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_blacklist ENABLE ROW LEVEL SECURITY;

ALTER FUNCTION update_updated_at_column() SET search_path = '';

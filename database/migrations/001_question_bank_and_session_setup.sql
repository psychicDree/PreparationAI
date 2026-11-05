-- Brings a database created from an older schema.sql up to date for the AI question bank.
-- Idempotent: safe to run more than once. Fresh databases get all of this from schema.sql.
-- Apply with: psql "$DATABASE_URL" -f database/migrations/001_question_bank_and_session_setup.sql
-- then seed:  psql "$DATABASE_URL" -f database/question_bank_seed.sql

ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS experience INTEGER;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS preferences TEXT[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL UNIQUE,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('technical', 'behavioral', 'system_design')),
    tags TEXT[] NOT NULL DEFAULT '{}',
    min_experience INTEGER NOT NULL DEFAULT 0 CHECK (min_experience BETWEEN 0 AND 5),
    max_experience INTEGER NOT NULL DEFAULT 5 CHECK (max_experience BETWEEN 0 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_tags ON question_bank USING GIN(tags);

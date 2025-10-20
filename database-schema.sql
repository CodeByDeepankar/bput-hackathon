-- GYANARATNA Platform Database Schema
-- Run this SQL in your Supabase SQL Editor to create all necessary tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SUBJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  class TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- QUIZZES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  time_limit INTEGER, -- in seconds
  passing_score INTEGER, -- percentage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_subject_id ON quizzes(subject_id);

-- ============================================================================
-- QUESTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  options JSONB NOT NULL, -- array of answer options
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  "order" INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);

-- ============================================================================
-- QUIZ_RESPONSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_responses (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  answers JSONB, -- map of question ids to answers
  score NUMERIC,
  correct_answers INTEGER,
  total_questions INTEGER,
  time_spent INTEGER, -- in seconds
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_responses_student_id ON quiz_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_quiz_id ON quiz_responses(quiz_id);

-- ============================================================================
-- QUIZ_COMPLETIONS TABLE (for streak tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_completions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  score NUMERIC,
  time_spent INTEGER, -- in seconds
  subject TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_completions_user_id ON quiz_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_completions_completed_at ON quiz_completions(completed_at);
CREATE INDEX IF NOT EXISTS idx_quiz_completions_user_date ON quiz_completions(user_id, completed_at);

-- ============================================================================
-- STREAKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS streaks (
  user_id TEXT PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  last_completion_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STUDENT_PROGRESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_progress (
  id TEXT PRIMARY KEY,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER_ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT PRIMARY KEY,
  role TEXT CHECK (role IN ('teacher', 'student', 'unassigned')),
  name TEXT,
  class TEXT,
  school_id TEXT,
  provisional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ACHIEVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_key ON achievements(key);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_subjects_updated_at ON subjects;
CREATE TRIGGER update_subjects_updated_at 
  BEFORE UPDATE ON subjects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quizzes_updated_at ON quizzes;
CREATE TRIGGER update_quizzes_updated_at 
  BEFORE UPDATE ON quizzes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at 
  BEFORE UPDATE ON user_roles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_streaks_updated_at ON streaks;
CREATE TRIGGER update_streaks_updated_at 
  BEFORE UPDATE ON streaks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (Optional - comment out if not needed)
-- ============================================================================

-- Insert sample subject
INSERT INTO subjects (id, name, description, class, icon, color)
VALUES 
  ('subject:science', 'Science', 'Explore the wonders of science', '5-8', '🔬', '#3b82f6'),
  ('subject:math', 'Mathematics', 'Master mathematical concepts', '5-8', '🔢', '#10b981'),
  ('subject:english', 'English', 'Improve language skills', '5-8', '📚', '#f59e0b')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE '📋 Tables created:';
  RAISE NOTICE '   - subjects';
  RAISE NOTICE '   - quizzes';
  RAISE NOTICE '   - questions';
  RAISE NOTICE '   - quiz_responses';
  RAISE NOTICE '   - quiz_completions';
  RAISE NOTICE '   - streaks';
  RAISE NOTICE '   - student_progress';
  RAISE NOTICE '   - user_roles';
  RAISE NOTICE '   - achievements';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Your database is ready to use!';
END $$;

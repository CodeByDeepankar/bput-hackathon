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
  created_by TEXT,
  school_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS school_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects(school_id);

-- ============================================================================
-- LEARNING_MODULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS learning_modules (
  id TEXT PRIMARY KEY,
  school_id TEXT,
  class TEXT,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  published BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_modules_school_id ON learning_modules(school_id);
CREATE INDEX IF NOT EXISTS idx_learning_modules_class ON learning_modules(class);
CREATE INDEX IF NOT EXISTS idx_learning_modules_subject_id ON learning_modules(subject_id);
CREATE INDEX IF NOT EXISTS idx_learning_modules_school_class_subject ON learning_modules(school_id, class, subject_id);

-- ============================================================================
-- QUIZZES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  module_id TEXT REFERENCES learning_modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  time_limit INTEGER, -- in seconds
  created_by TEXT,
  school_id TEXT,
  is_bank BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  passing_score INTEGER, -- percentage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure new quiz columns exist when upgrading an already provisioned database
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS module_id TEXT REFERENCES learning_modules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS school_id TEXT,
  ADD COLUMN IF NOT EXISTS is_bank BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS passing_score INTEGER;

CREATE INDEX IF NOT EXISTS idx_quizzes_subject_id ON quizzes(subject_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_school_id ON quizzes(school_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_module_id ON quizzes(module_id);

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
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  topic TEXT,
  sub_topic TEXT,
  school_id TEXT,
  "order" INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure upgraded databases carry new question metadata columns
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS school_id TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS sub_topic TEXT,
  ADD COLUMN IF NOT EXISTS "order" INTEGER;

-- Apply difficulty constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'questions'
      AND constraint_name = 'questions_difficulty_check'
  ) THEN
    ALTER TABLE questions
      ADD CONSTRAINT questions_difficulty_check
      CHECK (difficulty IN ('easy', 'medium', 'hard'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_school_id ON questions(school_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);

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
-- SCHOOL CONTENT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS school_content (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  type TEXT CHECK (type IN ('quiz', 'article', 'video', 'material')) DEFAULT 'article',
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  embed_html TEXT,
  body TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_content_school_id ON school_content(school_id);
CREATE INDEX IF NOT EXISTS idx_school_content_created_at ON school_content(created_at DESC);

-- ============================================================================
-- LESSONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES learning_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_path TEXT,
  video_url TEXT,
  video_type TEXT DEFAULT 'youtube',
  duration INTEGER DEFAULT 0, -- video duration in seconds
  order_index INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT TRUE,
  published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order_index ON lessons(module_id, order_index);

-- ============================================================================
-- LESSON_PROGRESS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lesson_progress (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL, -- references Clerk user ID / user_roles.user_id
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_position INTEGER DEFAULT 0, -- video timestamp in seconds
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_lesson UNIQUE (student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_id ON lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);

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

DROP TRIGGER IF EXISTS update_school_content_updated_at ON school_content;
CREATE TRIGGER update_school_content_updated_at
  BEFORE UPDATE ON school_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_learning_modules_updated_at ON learning_modules;
CREATE TRIGGER update_learning_modules_updated_at
  BEFORE UPDATE ON learning_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lesson_progress_updated_at ON lesson_progress;
CREATE TRIGGER update_lesson_progress_updated_at
  BEFORE UPDATE ON lesson_progress
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
  RAISE NOTICE '   - learning_modules';
  RAISE NOTICE '   - quizzes';
  RAISE NOTICE '   - questions';
  RAISE NOTICE '   - quiz_responses';
  RAISE NOTICE '   - quiz_completions';
  RAISE NOTICE '   - streaks';
  RAISE NOTICE '   - student_progress';
  RAISE NOTICE '   - user_roles';
  RAISE NOTICE '   - achievements';
  RAISE NOTICE '   - school_content';
  RAISE NOTICE '   - lessons';
  RAISE NOTICE '   - lesson_progress';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Your database is ready to use!';
END $$;

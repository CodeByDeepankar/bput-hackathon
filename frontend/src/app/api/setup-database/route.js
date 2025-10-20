import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Database Setup Endpoint
 * 
 * This endpoint creates all required database tables.
 * Visit: http://localhost:3000/api/setup-database
 * 
 * WARNING: This should only be run once during initial setup!
 */
export async function POST() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Missing Supabase credentials in environment variables" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // SQL to create quiz_completions table
    const createQuizCompletionsTable = `
      CREATE TABLE IF NOT EXISTS quiz_completions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        quiz_id TEXT NOT NULL,
        score NUMERIC,
        time_spent INTEGER,
        subject TEXT,
        completed_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_quiz_completions_user_id ON quiz_completions(user_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_completions_completed_at ON quiz_completions(completed_at);
      CREATE INDEX IF NOT EXISTS idx_quiz_completions_user_date ON quiz_completions(user_id, completed_at);
    `;

    // SQL to create streaks table
    const createStreaksTable = `
      CREATE TABLE IF NOT EXISTS streaks (
        user_id TEXT PRIMARY KEY,
        current_streak INTEGER DEFAULT 0,
        last_completion_date DATE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // SQL to create other essential tables
    const createOtherTables = `
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

      CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
        time_limit INTEGER,
        passing_score INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        quiz_id TEXT NOT NULL,
        text TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        "order" INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS quiz_responses (
        id TEXT PRIMARY KEY,
        quiz_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        answers JSONB,
        score NUMERIC,
        correct_answers INTEGER,
        total_questions INTEGER,
        time_spent INTEGER,
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS student_progress (
        id TEXT PRIMARY KEY,
        payload JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

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

      CREATE INDEX IF NOT EXISTS idx_quizzes_subject_id ON quizzes(subject_id);
      CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_responses_student_id ON quiz_responses(student_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_responses_quiz_id ON quiz_responses(quiz_id);
      CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
      CREATE INDEX IF NOT EXISTS idx_achievements_key ON achievements(key);
    `;

    const results = [];

    // Note: Supabase JS client doesn't support raw SQL execution
    // You need to run this SQL manually in Supabase SQL Editor
    
    return NextResponse.json({
      success: false,
      message: "Please run the SQL manually in Supabase Dashboard",
      instructions: [
        "1. Go to https://app.supabase.com/",
        "2. Select your project",
        "3. Navigate to SQL Editor",
        "4. Copy and paste the SQL from database-schema.sql file",
        "5. Click RUN",
        "6. Restart your Next.js app"
      ],
      sql: {
        quiz_completions: createQuizCompletionsTable,
        streaks: createStreaksTable,
        other_tables: createOtherTables
      }
    });

  } catch (error) {
    console.error("Database setup error:", error);
    return NextResponse.json(
      { 
        error: "Database setup failed", 
        message: error.message,
        details: "Please run the SQL schema manually in Supabase SQL Editor"
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Database Setup Endpoint",
    instructions: "Send a POST request to create database tables",
    note: "You need to run the SQL manually in Supabase Dashboard",
    sql_file: "See database-schema.sql in project root"
  });
}

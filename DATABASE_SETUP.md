# Database Setup Guide

## Quick Setup

### Step 1: Access Supabase SQL Editor
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **SQL Editor** from the left sidebar
4. Click **New Query**

### Step 2: Run the Schema
1. Open the `database-schema.sql` file in this repository
2. Copy all the SQL code
3. Paste it into the SQL Editor in Supabase
4. Click **Run** or press `Ctrl + Enter`

### Step 3: Verify Tables
1. Go to **Table Editor** in Supabase
2. You should see all the following tables:
   - ✅ subjects
   - ✅ quizzes
   - ✅ questions
   - ✅ quiz_responses
   - ✅ quiz_completions ⭐ (This fixes the error!)
   - ✅ streaks
   - ✅ student_progress
   - ✅ user_roles
   - ✅ achievements

## What This Fixes

The error you were seeing:
```
API 500: Could not find the table 'public.quiz_completions' in the schema cache
```

This happens because the `quiz_completions` table was missing from your database. The SQL script creates this table along with all other required tables.

## Table Purposes

### `quiz_completions`
This table is crucial for:
- **Streak tracking** - Records when users complete quizzes daily
- **Daily activity** - Calculates how many quizzes completed per day
- **Progress monitoring** - Tracks learning consistency
- **Leaderboards** - Ranks users by activity

### Other Important Tables

- **`subjects`** - Subject categories (Math, Science, etc.)
- **`quizzes`** - Quiz metadata and settings
- **`questions`** - Individual quiz questions
- **`quiz_responses`** - Student answers and scores
- **`streaks`** - User streak statistics
- **`student_progress`** - Overall progress tracking
- **`user_roles`** - User role management (teacher/student)
- **`achievements`** - Gamification achievements

## After Setup

Once you run the SQL script:

1. **Restart your Next.js development server**
   ```bash
   # Stop the current server (Ctrl + C)
   npm run dev
   ```

2. **Test the application**
   - Visit http://localhost:3000
   - Try logging in and accessing student dashboard
   - The streak widget should now work without errors

3. **Check for errors**
   - Open browser console (F12)
   - Look for any remaining API errors
   - All database-related errors should be resolved

## Troubleshooting

### Still getting errors?

1. **Verify tables were created**
   - Go to Supabase Table Editor
   - Check if all tables exist

2. **Check environment variables**
   - Ensure `SUPABASE_URL` is correct in `.env.local`
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is correct

3. **Clear cache and restart**
   ```bash
   rm -rf .next
   npm run dev
   ```

4. **Check Supabase logs**
   - Go to Supabase Dashboard → Logs
   - Look for any database errors

### Need to reset?

To drop all tables and start fresh:
```sql
-- WARNING: This deletes all data!
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS quiz_completions CASCADE;
DROP TABLE IF EXISTS quiz_responses CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS streaks CASCADE;
DROP TABLE IF EXISTS student_progress CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
```

Then re-run the `database-schema.sql` script.

## Sample Data

The schema includes some sample subjects (Science, Math, English). You can:
- Keep them as starter data
- Delete them from the `subjects` table
- Modify them as needed

## Security Notes

After creating tables, consider:
1. **Row Level Security (RLS)** - Enable for production
2. **Policies** - Set up access control policies
3. **API Keys** - Use anon key for client-side, service role for server-side only

## Next Steps

After database setup:
1. ✅ Tables created
2. ✅ Start Next.js server
3. ✅ Test user registration
4. ✅ Create subjects and quizzes
5. ✅ Test student quiz-taking flow
6. ✅ Verify streak tracking works

Happy coding! 🚀

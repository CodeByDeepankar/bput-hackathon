# 🔧 FIX: API 500 Error - Missing Database Tables

## ❌ Current Error

```
API 500: Could not find the table 'public.quiz_completions' in the schema cache
```

**Root Cause:** The required database tables don't exist in your Supabase database yet.

---

## ✅ Solution: Set Up Database Tables

### **Step 1: Access Supabase SQL Editor**

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Sign in to your account

2. **Select Your Project**
   - Click on your GYANARATNA project

3. **Open SQL Editor**
   - In the left sidebar, click on **"SQL Editor"**
   - Or use the direct link: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql`

### **Step 2: Run Database Schema**

1. **Click "New Query"**
   - This opens a blank SQL editor

2. **Copy the Schema SQL**
   - Open the file: `database-schema.sql` in your project root
   - Copy **ALL** the content (Ctrl+A, Ctrl+C)

3. **Paste into SQL Editor**
   - Paste the entire SQL script into the Supabase SQL Editor

4. **Execute the Script**
   - Click the **"Run"** button (or press Ctrl+Enter)
   - Wait for execution to complete

5. **Verify Success**
   - You should see a success message
   - Check the "Messages" panel for:
     ```
     ✅ Database schema created successfully!
     📋 Tables created:
        - subjects
        - quizzes
        - questions
        - quiz_responses
        - quiz_completions  ← This is the missing table
        - streaks
        - student_progress
        - user_roles
        - achievements
     ```

### **Step 3: Verify Tables Were Created**

1. **Go to Table Editor**
   - In left sidebar, click **"Table Editor"**

2. **Check for These Tables:**
   - ✅ `subjects`
   - ✅ `quizzes`
   - ✅ `questions`
   - ✅ `quiz_responses`
   - ✅ `quiz_completions` ← **The critical one!**
   - ✅ `streaks`
   - ✅ `student_progress`
   - ✅ `user_roles`
   - ✅ `achievements`

### **Step 4: Test the Application**

1. **Refresh Your App**
   - Go to: `http://localhost:3004`
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

2. **Check Dashboard**
   - The streak widget should now load without errors
   - No more "API 500" errors in console

3. **Test Quiz Completion**
   - Take a quiz
   - Complete it
   - Check if streak updates correctly

---

## 📊 What Each Table Does

### **quiz_completions** (The Missing Table!)
```sql
CREATE TABLE quiz_completions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  score NUMERIC,
  time_spent INTEGER,
  subject TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose:**
- Tracks when users complete quizzes
- Stores quiz scores and time spent
- Used for streak calculation
- Powers the dashboard statistics

**Why It Was Missing:**
- Database schema wasn't run in Supabase
- The API expects this table to exist
- Without it, streak tracking fails

---

## 🔍 Troubleshooting

### **Issue 1: SQL Execution Fails**

**Symptoms:**
- Red error message in SQL editor
- Tables not created

**Solutions:**
1. Check if you have the correct permissions (should be project owner/admin)
2. Try running the schema in smaller sections:
   - First: Create tables only (subjects → achievements)
   - Then: Create indexes
   - Finally: Create functions and triggers

### **Issue 2: Tables Already Exist**

**Symptoms:**
- Error: "relation already exists"

**Solution:**
- This is actually good! It means some tables were created
- The script uses `CREATE TABLE IF NOT EXISTS` so it's safe to re-run
- Check Table Editor to see which tables exist
- If `quiz_completions` exists, you're good!

### **Issue 3: Error Persists After Creating Tables**

**Symptoms:**
- Tables exist but error still shows

**Solutions:**
1. **Clear Application Cache:**
   ```powershell
   cd frontend
   Remove-Item -Recurse -Force .next
   npm run dev
   ```

2. **Check Supabase Connection:**
   - Verify `.env` file has correct Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Test Supabase Connection:**
   - Open browser console on your app
   - Check Network tab for failed API calls
   - Verify Supabase project is active (not paused)

### **Issue 4: Permission Errors**

**Symptoms:**
- "permission denied for table quiz_completions"

**Solution:**
1. Go to Supabase Dashboard → **Authentication** → **Policies**
2. Add RLS (Row Level Security) policies:

```sql
-- Allow authenticated users to read their own completions
CREATE POLICY "Users can view own completions"
ON quiz_completions
FOR SELECT
USING (auth.uid()::text = user_id);

-- Allow authenticated users to insert their own completions
CREATE POLICY "Users can insert own completions"
ON quiz_completions
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);
```

---

## 🎯 Quick Fix Checklist

- [ ] Open Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Copy `database-schema.sql` content
- [ ] Paste and run in SQL Editor
- [ ] Verify success message appears
- [ ] Check Table Editor for all 9 tables
- [ ] Clear Next.js cache (`.next` folder)
- [ ] Restart dev server
- [ ] Refresh browser (hard refresh)
- [ ] Test application - error should be gone!

---

## 📸 Visual Guide

### **Before (Error State):**
```
❌ API 500: Could not find table 'public.quiz_completions'
❌ Streak widget fails to load
❌ Dashboard shows errors
```

### **After (Fixed State):**
```
✅ All API calls succeed
✅ Streak widget displays correctly
✅ Dashboard loads smoothly
✅ Quiz completions are tracked
```

---

## 🚀 After Setup

Once the tables are created, your application will be able to:

1. **Track Quiz Completions**
   - Record when users finish quizzes
   - Store scores and performance data

2. **Calculate Streaks**
   - Monitor daily activity
   - Award streak achievements
   - Show streak statistics

3. **Display Dashboard Stats**
   - Total quizzes completed
   - Average scores
   - Progress over time

4. **Enable Game Recommendations**
   - Store quiz results for analysis
   - Trigger game suggestions based on performance

---

## 📝 Additional Notes

### **Database Schema Features:**

✅ **Auto-timestamps:** Tables automatically track creation/update times  
✅ **Foreign Keys:** Maintains data integrity between related tables  
✅ **Indexes:** Optimizes query performance  
✅ **Triggers:** Updates timestamps automatically  
✅ **Sample Data:** Includes starter subjects (optional)  

### **Safe to Re-run:**
The schema uses `IF NOT EXISTS` clauses, so you can safely run it multiple times without breaking existing data.

### **Data Persistence:**
Once created, these tables will persist even if you:
- Restart your application
- Deploy to production
- Update your code

---

## ✅ Verification Commands

After running the schema, verify in Supabase SQL Editor:

```sql
-- Check if quiz_completions table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'quiz_completions';

-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check quiz_completions structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quiz_completions';
```

---

## 🎉 Success!

Once you complete these steps:
- ✅ The error will disappear
- ✅ Your app will load correctly
- ✅ Streak tracking will work
- ✅ Quiz system will be fully functional

**Your GYANARATNA platform will be fully operational!** 🚀

---

## 📞 Need Help?

If you encounter any issues:
1. Check the console for specific error messages
2. Verify Supabase project status
3. Ensure environment variables are set correctly
4. Clear browser cache and restart dev server

**The database schema is the foundation - once it's set up, everything else will work!**

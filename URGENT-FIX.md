# 🔧 URGENT FIX: Database Setup Required

## 🚨 Current Error
```
API 500: Could not find the table 'public.quiz_completions' in the schema cache
```

## ⚡ Quick Fix (5 minutes)

### Step 1: Open Supabase Dashboard
1. Go to **https://app.supabase.com/**
2. **Sign in** to your account
3. **Select** your project: `nzydptqhsjgjwebrmord`

### Step 2: Open SQL Editor
1. In the left sidebar, click **"SQL Editor"**
2. Click **"+ New query"** button (top right)

### Step 3: Run the Database Schema
1. Open the file: `database-schema.sql` (in your project root folder)
2. **Copy ALL the SQL code** (Ctrl + A, then Ctrl + C)
3. **Paste** into the Supabase SQL Editor
4. Click **"RUN"** button (or press Ctrl + Enter)
5. Wait for success message ✅

### Step 4: Verify Tables Created
1. In left sidebar, click **"Table Editor"**
2. You should now see these tables:
   - subjects
   - quizzes  
   - questions
   - quiz_responses
   - **quiz_completions** ⭐ (this fixes your error!)
   - streaks
   - student_progress
   - user_roles
   - achievements

### Step 5: Restart Your App
```powershell
# In your terminal, press Ctrl + C to stop the server
# Then restart:
cd frontend
npm run dev
```

### Step 6: Test
1. Visit **http://localhost:3000**
2. The error should be **GONE** ✅
3. Streak tracking should work! 🎉

---

## 🎯 What This Fixes

The `quiz_completions` table is **essential** for:
- ✅ Daily streak tracking
- ✅ Quiz history
- ✅ Daily activity summaries  
- ✅ Student progress monitoring
- ✅ Leaderboard functionality

---

## 🔍 Alternative: Check What's Missing

Run this command to see which tables are missing:

```powershell
cd frontend
node scripts/check-database.js
```

This will show you exactly which tables exist and which are missing.

---

## ❓ Troubleshooting

### "I can't find database-schema.sql"
- It's in the **root folder** of your project
- Path: `c:\Users\Swastik07\Desktop\BPUT-HACKATHON\bput-hackathon\database-schema.sql`

### "SQL Editor shows an error"
- Make sure you copied **ALL** the SQL (it's a long file)
- Make sure you're logged into the correct Supabase project
- Try running sections one at a time if needed

### "Tables still not showing"
- Refresh the Table Editor page
- Check the Supabase project URL matches your .env file
- Try clearing browser cache

### "Still getting the error after setup"
- Restart your Next.js dev server completely
- Clear the .next build cache:
  ```powershell
  Remove-Item -Recurse -Force .next
  npm run dev
  ```

---

## 📱 Visual Guide

### Where to find SQL Editor:
```
Supabase Dashboard
├── 📊 Table Editor        ← Check tables here AFTER running SQL
├── 🔍 SQL Editor          ← RUN THE SQL HERE
├── 🔐 Authentication
└── ⚙️ Project Settings
```

### What you should see after running SQL:
```
✅ Success. No rows returned
```

### Table Editor should show:
```
Tables (9)
├── subjects
├── quizzes
├── questions
├── quiz_responses
├── quiz_completions       ← THIS FIXES YOUR ERROR!
├── streaks
├── student_progress
├── user_roles
└── achievements
```

---

## 🎓 Understanding the Database

Your app needs these tables to work:

| Table | Purpose |
|-------|---------|
| `subjects` | Math, Science, English, etc. |
| `quizzes` | Quiz metadata and settings |
| `questions` | Individual quiz questions |
| `quiz_responses` | Student answers and scores |
| **`quiz_completions`** | **Streak tracking (MISSING!)** |
| `streaks` | User streak statistics |
| `student_progress` | Overall progress tracking |
| `user_roles` | Teacher/Student roles |
| `achievements` | Gamification badges |

---

## 💡 Why This Happened

The database tables weren't created during initial setup. This is a **one-time setup** that needs to be done manually in Supabase.

Once you run the SQL schema, you'll **never need to do this again** for this project! 🎉

---

## ✅ Success Checklist

- [ ] Opened Supabase Dashboard
- [ ] Found SQL Editor
- [ ] Copied ALL SQL from database-schema.sql
- [ ] Ran the SQL successfully
- [ ] Verified tables in Table Editor
- [ ] Restarted Next.js dev server
- [ ] Tested the app - NO MORE ERROR! 🎉

---

## 🆘 Still Need Help?

If you're still stuck:

1. **Check your Supabase credentials**:
   ```
   SUPABASE_URL=https://nzydptqhsjgjwebrmord.supabase.co
   ```
   This should match your project URL in Supabase Dashboard

2. **Check the full error in terminal**:
   Look for any other error messages

3. **Verify you're in the right project**:
   Your project ID: `nzydptqhsjgjwebrmord`

---

**Need to do this NOW to fix your app!** ⚡

Good luck! 🚀

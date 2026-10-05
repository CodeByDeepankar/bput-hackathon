# 🚨 URGENT FIX REQUIRED 🚨

## Current Error
```
API 500: Could not find the table 'public.quiz_completions' in the schema cache
```

---

## 🔥 Quick Fix (5 Minutes)

### **Step 1: Open Supabase**
Go to: **https://supabase.com/dashboard**

### **Step 2: SQL Editor**
Click: **SQL Editor** in left sidebar

### **Step 3: Copy & Paste**
1. Open file: `database-schema.sql`
2. Copy **ALL** content (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor

### **Step 4: Run**
Click: **"Run"** button (or Ctrl+Enter)

### **Step 5: Verify**
Check for success message:
```
✅ Database schema created successfully!
📋 Tables created:
   - quiz_completions ← This fixes your error!
   - streaks
   - subjects
   ... and 6 more
```

### **Step 6: Refresh App**
```powershell
# Clear cache and restart
cd frontend
Remove-Item -Recurse -Force .next
npm run dev
```

---

## ✅ Done!
- Error will disappear
- Streak tracking will work
- Dashboard will load correctly

---

## 📋 What Happened?
Your app expects database tables that don't exist yet. The `database-schema.sql` file creates all 9 required tables including the missing `quiz_completions` table.

## 🎯 Why This Error?
The streak tracking feature tries to query `quiz_completions` table to calculate your learning streak, but the table wasn't created in Supabase yet.

---

**See `FIX_DATABASE_ERROR.md` for detailed instructions with screenshots and troubleshooting.**

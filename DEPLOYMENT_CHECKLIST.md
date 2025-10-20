# 🚀 Deployment Checklist for Forked Repositories

## ✅ Pre-Deployment Checklist

### 1. System Requirements
- [ ] Node.js v18+ installed
- [ ] Supabase project created and accessible
- [ ] Git installed
- [ ] Terminal/Command prompt access

### 2. Supabase Setup
- [ ] Project URL copied (Settings → API)
- [ ] Service Role key copied (Settings → API)
- [ ] (Optional) anon key stored for frontend use
- [ ] Required tables created via Supabase SQL editor

### 3. Environment Configuration
- [ ] Copied `backend/.env.example` to `backend/.env`
- [ ] Added Supabase credentials to `.env`
- [ ] Copied `frontend/.env.local.example` to `frontend/.env.local`
- [ ] Verified API URL in frontend environment

### 4. Dependencies Installation
- [ ] Backend: `cd backend && npm install`
- [ ] Frontend: `cd frontend && npm install`

### 5. Database Initialization
- [ ] Backend server started successfully
- [ ] Health check passes: http://localhost:4000/health
- [ ] Supabase query succeeds (e.g., verify tables via Supabase dashboard)

### 6. Application Testing
- [ ] Frontend loads: http://localhost:3000
- [ ] No connection errors in browser console
- [ ] User registration works
- [ ] Role selection (teacher/student) works
- [ ] Basic functionality tested

## 🔧 Common Issues & Solutions

### ❌ "Failed to fetch" Error

**Problem**: Frontend shows "Backend server is not running"

**Solutions**:
1. Check if backend server is running on port 4000
2. Verify Supabase credentials are present in backend/.env
3. Confirm Supabase project is reachable via https://status.supabase.com
4. Check firewall/antivirus blocking connections

**Debug Steps**:
```bash
# Test backend health
curl http://localhost:4000/health

# Verify environment variables
cd backend && npm run env-check
```

### ❌ Database Connection Failed

**Problem**: Server logs show Supabase errors (401/404/permission denied)

**Solutions**:
1. Regenerate the Service Role key and update `.env`
2. Verify table names match expectations in Supabase
3. Inspect Row Level Security policies for the affected tables
4. Review Supabase project logs (Dashboard → Logs)

### ❌ CORS Errors

**Problem**: Browser console shows CORS policy errors

**Solutions**:
1. Verify FRONTEND_URL in backend/.env
2. Check CORS configuration in server.js
3. Ensure both servers are running

### ❌ Data Missing in Dashboard

**Problem**: Student progress shows no data

**Solutions**:
1. Open the Supabase dashboard and inspect the `student_progress` and `quiz_responses` tables
2. Confirm backend logs show successful insert operations
3. Verify Supabase Row Level Security policies allow the service role to read/write

## 🛠️ Environment Configuration Templates

### Backend `.env` File
```env
# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Optional anon key if re-used in API routes
# SUPABASE_ANON_KEY=your-anon-key

# Server Configuration
PORT=4000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env.local` File
```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 🐳 Docker Quick Setup (Alternative)

If you have Docker installed:

```bash
# Start backend container (example)
docker-compose up -d backend frontend

# Supabase remains a managed service (no local container needed)
```

## 🌐 Production Deployment Notes

### Environment Variables for Production
```env
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key
# Optional anon key if required by your deployment
# SUPABASE_ANON_KEY=your-anon-key
FRONTEND_URL=https://your-domain.com
```

### Security Checklist
- [ ] Rotate Supabase service role key regularly
- [ ] Use HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Set up database backups

## 📞 Getting Help

If you're still having issues:

1. **Check Logs**: Look at both frontend and backend console logs
2. **Health Check**: Visit http://localhost:4000/health
3. **Network Tab**: Check browser's Network tab for failed requests
4. **Environment**: Verify all environment variables are set correctly
5. **Ports**: Ensure ports 3000 and 4000 are available

## 📱 Testing the Application

Once everything is running:

1. **Visit**: http://localhost:3000
2. **Sign Up**: Create a new account
3. **Choose Role**: Select Teacher or Student
4. **Test Features**:
   - Teacher: Create subjects, add quizzes
   - Student: Take quizzes, view progress
5. **Check Progress**: Verify data appears in Supabase tables

## 🔄 Updates and Maintenance

To update the application:
```bash
git pull origin main
cd backend && npm install
cd ../frontend && npm install
# Restart both servers
```

Remember to schedule Supabase backups before major updates!

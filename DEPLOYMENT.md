# 🎯 GYANARATNA Platform - Deployment Guide

## 🚀 Quick Setup for New Machines

### Prerequisites
- Node.js (v18 or higher)
- Supabase project with access to Project URL and Service Role key
- Git

### 1. Clone and Setup
```bash
git clone https://github.com/CodeByDeepankar/hackthon-sih.git
cd hackthon-sih
node setup.js
```

### 2. Configure Supabase

1. Sign in to [Supabase](https://supabase.com/) and create a new project
2. From *Project Settings → API*, copy the **Project URL** and **Service Role** key
3. (Optional) Copy the **anon** key if the frontend will call Supabase directly
4. Use the SQL editor to provision tables such as `subjects`, `quizzes`, `questions`, `student_progress`, `quiz_responses`, `streaks`, and `achievements`

### 3. Configure Environment Variables

Copy the example environment file and update with your settings:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Optional if exposing anon key via backend endpoints
# SUPABASE_ANON_KEY=your-anon-key

# Server Configuration
PORT=4000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### 4. Start the Services

#### Terminal 1 - Backend
```bash
cd backend
npm install
npm start
```

#### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm run dev
```

### 5. Initialize Database
Supabase manages views automatically. Ensure the required tables exist and contain seed data if needed.

### 6. Health Check
Visit: http://localhost:4000/health to verify everything is working

## 🔧 Troubleshooting

### "Failed to fetch" Error
This usually means:
1. **Backend not running**: Make sure backend server is running on port 4000
2. **Supabase credentials invalid**: Confirm URL and Service Role key in `.env`
3. **CORS issues**: Ensure frontend URL is in CORS configuration

### Database Connection Issues
1. Verify `.env` contains `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Regenerate the Service Role key if it was rotated
3. Inspect Supabase logs (Dashboard → Logs) for errors

### Port Already in Use
```bash
# Kill process using port 4000
npx kill-port 4000

# Kill process using port 3000
npx kill-port 3000
```

## 🏢 Production Deployment

### Environment Variables for Production
```env
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
# Optional anon key if required by your deployment
# SUPABASE_ANON_KEY=your-anon-key
FRONTEND_URL=https://your-domain.com
PORT=4000
```

### Docker Deployment

#### Backend Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

#### Frontend Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
      - PORT=4000
    ports:
      - "4000:4000"

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

## 📊 Database Schema

Ensure your Supabase project includes tables that align with the application's expectations:
- `users` - User roles and school information
- `subjects` - Educational subjects
- `quizzes` - Quiz definitions
- `questions` - Quiz questions
- `responses` - Student quiz responses
- `streaks` - Daily streak tracking
- `quiz_completions` - Quiz completion records

## 🔐 Security Notes

1. Rotate Supabase service role keys regularly and store them securely
2. Use environment variables for all credentials
3. Enable HTTPS in production
4. Configure proper CORS origins
5. Use secure session management

## 📱 Features

- **Role-based Access**: Teacher and Student dashboards
- **Real-time Progress Tracking**: Live student analytics
- **Offline Support**: PWA with offline capabilities
- **Quiz Management**: Create and manage educational content
- **School-wide Analytics**: Track performance across students
- **Daily Streaks**: Gamified learning engagement

## 🆘 Support

If you encounter issues:
1. Check the health endpoint: http://localhost:4000/health
2. Review server logs for errors
3. Verify Supabase connectivity via dashboard queries
4. Ensure all environment variables are set correctly

## 🔄 Updates

To update the application:
```bash
git pull origin main
cd backend && npm install
cd ../frontend && npm install
```

Remember to schedule Supabase backups before updates!

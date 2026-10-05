# GYANARATNA Platform - Full-Stack Guide

## System Architecture

This is a comprehensive learning management system built with modern technologies:

### Backend Stack
- **Next.js API Route Handlers (Node.js)** - REST API served from `frontend/src/app/api`
- **Supabase (PostgreSQL)** - Managed relational database
- **@supabase/supabase-js** - Supabase client for server-side access

### Frontend Stack  
- **Next.js 15** - React framework with App Router
- **Tailwind CSS** - Utility-first CSS framework
- **Clerk** - Authentication and user management
- **Custom API client** - Communicates with the Supabase-backed REST API

> ℹ️ The legacy `backend/server.js` Express server has been fully migrated into Next.js API route handlers under `frontend/src/app/api`. All endpoints referenced below map to files within that directory structure.

### Database Schema

Supabase stores application data in relational tables. Key structures include:

#### `subjects`
| column | type | notes |
| --- | --- | --- |
| id | text | primary key generated via `subject:<slug>` |
| name | text | subject display name |
| class | text | grade or class identifier |
| description | text | optional summary |
| created_by | text | Clerk user id of creator |
| school_id | text | optional school/group reference |
| created_at | timestamptz | defaults to `now()` |
| updated_at | timestamptz | maintained by backend on updates |

#### `quizzes`
| column | type | notes |
| --- | --- | --- |
| id | text | primary key generated via `quiz:<slug>` |
| subject_id | text | foreign key → `subjects.id` |
| title | text | quiz title |
| description | text | optional overview |
| difficulty | text | enum-like string (`easy`, `medium`, `hard`) |
| time_limit | integer | time limit in seconds |
| created_by | text | creator user id |
| school_id | text | optional school/group reference |
| created_at | timestamptz | creation timestamp |
| updated_at | timestamptz | last modification timestamp |

#### `questions`
| column | type | notes |
| --- | --- | --- |
| id | text | primary key (`<quizId>:question:<n>`) |
| quiz_id | text | foreign key → `quizzes.id` |
| text | text | question prompt |
| options | jsonb | array of answer options |
| correct_answer | text | correct option identifier |
| explanation | text | optional rationale |
| order | integer | display order |
| created_at | timestamptz | insertion timestamp |

#### `quiz_responses`
| column | type | notes |
| --- | --- | --- |
| id | text | primary key (`response:<studentId>:<quizId>`) |
| quiz_id | text | quiz reference |
| student_id | text | Clerk user id |
| answers | jsonb | map of question ids to answers |
| score | numeric | percentage score (0-100) |
| correct_answers | integer | number of correct responses |
| total_questions | integer | number of questions attempted |
| time_spent | integer | seconds spent on quiz |
| submitted_at | timestamptz | submission timestamp |

#### `quiz_completions`
| column | type | notes |
| --- | --- | --- |
| id | text | primary key (`completion:<userId>:<quizId>`) |
| user_id | text | student identifier |
| quiz_id | text | quiz reference |
| score | numeric | completion score |
| time_spent | integer | seconds spent |
| subject | text | denormalised subject id |
| completed_at | timestamptz | completion timestamp |

#### `streaks`
| column | type | notes |
| --- | --- | --- |
| user_id | text | primary key |
| current_streak | integer | number of consecutive active days |
| last_completion_date | date | ISO date of last completion |
| updated_at | timestamptz | updated by backend when streak recalculates |

#### `student_progress`
| column | type | notes |
| --- | --- | --- |
| id | text | primary key (`progress:<studentId>`) |
| payload | jsonb | legacy progress payload retained for compatibility |
| created_at | timestamptz | timestamp of insertion |

#### `user_roles`
| column | type | notes |
| --- | --- | --- |
| user_id | text | primary key (Clerk user id) |
| role | text | `teacher`, `student`, or `unassigned` |
| name | text | display name |
| class | text | optional class/grade |
| school_id | text | optional school reference |
| provisional | boolean | `true` when auto-provisioned |
| created_at | timestamptz | creation timestamp |
| updated_at | timestamptz | last update timestamp |

#### `achievements`
| column | type | notes |
| --- | --- | --- |
| id | text | primary key (`ach:<userId>:<key>`) |
| user_id | text | student identifier |
| key | text | unique achievement key |
| title | text | user-facing label |
| description | text | optional description |
| icon | text | optional icon path |
| awarded_at | timestamptz | when achievement was granted |
| meta | jsonb | arbitrary metadata (e.g., thresholds) |

## Backend API Endpoints

### Subjects API
- `GET /subjects` - List all subjects (with optional class filter)
- `POST /subjects` - Create new subject (teacher only)
- `PUT /subjects/:id` - Update subject (teacher only)
- `DELETE /subjects/:id` - Delete subject (teacher only)

### Quizzes API
- `GET /quizzes` - List quizzes (with optional filters)
- `GET /quizzes/:id` - Get quiz with questions
- `POST /quizzes` - Create new quiz (teacher only)

### Quiz Responses API
- `POST /responses` - Submit quiz answers
- `GET /responses/student/:studentId` - Get student's quiz history

### Streak & Progress API
- `POST /quiz-completion` - Record quiz completion
- `GET /streak/:userId` - Get user's current streak
- `GET /daily-activity/:userId` - Get daily activity summary
- `GET /quiz-history/:userId` - Get quiz completion history

### Leaderboard API
- `GET /leaderboard` - Get leaderboard data

### User Management API
- `GET /users/:userId/role` - Get user role
- `POST /users/role` - Set user role

### Setup API
- `POST /setup-views` - Create database views

## Frontend Components Architecture

### Pages
- `/student` - Student dashboard with subjects, quizzes, and streak tracking
- `/teacher` - Teacher dashboard for managing subjects and quizzes
- `/role-select` - Role selection for new users

### Key Components

**Student Dashboard Components:**
- `SubjectCard` - Display subject with navigation to quizzes
- `QuizCard` - Display quiz with difficulty and time info
- `QuizAttempt` - Full quiz taking interface with timer
- `StreakWidget` - Real-time streak display and motivation
- `StreakStats` - Daily activity and progress statistics

**Teacher Dashboard Components:**
- `SubjectManagementCard` - Subject CRUD operations
- `QuizManagementCard` - Quiz overview and actions
- `CreateSubjectForm` - Form to create new subjects
- `CreateQuizForm` - Form to create quizzes with questions

**Shared Components:**
- `OnlineBadge` - Network status indicator
- `OfflineNotice` - Offline mode notification
- `LanguageToggle` - Multi-language support
- `FooterNav` - Bottom navigation

### Custom Hooks

**API Hooks (`/hooks/useApi.js`):**
- `useSubjects()` - Manage subjects data and CRUD operations
- `useQuizzes()` - Manage quizzes data and creation
- `useQuiz(id)` - Fetch single quiz with questions
- `useQuizResponses()` - Handle quiz submissions
- `useDailyActivity()` - Track daily learning activity
- `useLeaderboard()` - Leaderboard data management
- `useUserRole()` - User role management

**Streak Hook (`/hooks/useStreak.js`):**
- Real-time streak tracking
- Daily quiz completion monitoring
- Motivational messaging
- Progress analytics

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- Supabase project credentials (Project URL + Service Role key)
- Git

### 1. Clone and Setup Backend

```bash
# Clone repository
git clone <repository-url>
cd gamified-stem-learning

# Setup backend
cd backend
npm install

# Create .env file
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Optional anon key if you surface Supabase directly via backend routes
# SUPABASE_ANON_KEY=your-anon-key
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EOF

# Start backend server
npm start
# Server will run on http://localhost:4000
```

### 2. Configure Supabase

1. Sign in to Supabase and create a project
2. Navigate to **Project Settings → API** to copy the Project URL and Service Role key
3. Use the SQL editor to create tables matching the schema documented above
4. (Optional) Load seed data using Supabase's SQL editor or CSV import

### 3. Setup Frontend

```bash
# Setup frontend
cd ../frontend
npm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_API_URL=http://localhost:4000
EOF

# Start development server
npm run dev
# Frontend will run on http://localhost:3000
```

### 4. Verify Connectivity

- Hit `http://localhost:4000/health` to confirm the backend can reach Supabase
- Use the Supabase dashboard to confirm new rows appear when creating subjects/quizzes

## Usage Guide

### For Teachers

1. **Sign up** with teacher role at `/role-select`
2. **Create subjects** in teacher dashboard
3. **Add quizzes** with multiple-choice questions
4. **Monitor student progress** through analytics

### For Students

1. **Sign up** with student role at `/role-select`
2. **Browse subjects** on student dashboard
3. **Take quizzes** with real-time timer
4. **Track daily streaks** and maintain learning momentum
5. **View progress** and achievements

### Real-time Streak System

The streak system automatically:
- ✅ Tracks daily quiz completions
- 🔥 Maintains streak counters
- 📊 Provides daily activity summaries
- 🎯 Motivates consistent learning
- 📈 Shows progress analytics

Students must complete at least one quiz daily to maintain their streak.

## Offline Support

The system supports offline learning through:
- **Service Worker** caching
- **Progressive Web App** features
- **Local data storage** for transient quiz state

## Production Deployment

### Backend Deployment
```bash
# Build for production
npm run build

# Set environment variables
export NODE_ENV=production
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Start production server
npm start
```

### Frontend Deployment
```bash
# Build for production
npm run build

# Deploy to Vercel/Netlify/your platform
npm run start
```

### Database Backup
- Enable [Supabase backups](https://supabase.com/docs/guides/platform/backups) for automated snapshots
- Use the SQL editor to export table data when a manual one-off backup is required

## Key Features Implemented

✅ **Complete CRUD for subjects and quizzes**
✅ **Real-time streak tracking with daily requirements**
✅ **Supabase-backed data layer with realtime-friendly design**
✅ **Role-based access control (Student/Teacher/Admin)**
✅ **Responsive design with dark mode support**
✅ **Multi-language support**
✅ **Progressive Web App capabilities**
✅ **Comprehensive analytics and leaderboards**
✅ **Timed quiz system with auto-submission**
✅ **Gamification with streaks and achievements**

## Performance Optimizations

- **Supabase SQL indexes** on frequently filtered columns (`subjects.id`, `quizzes.subject_id`, `quiz_responses.student_id`)
- **React Query/SWR** for data caching
- **Lazy Loading** of components
- **Image Optimization** with Next.js
- **Bundle Splitting** for faster loads
- **Service Worker** caching

## Security Features

- **Clerk Authentication** with role-based access
- **Input Validation** on all forms
- **Parameterized Supabase queries** to avoid SQL injection
- **CORS Configuration** for API security
- **Environment Variables** for sensitive data

## Monitoring and Analytics

- Quiz completion rates
- Daily active users
- Streak distributions
- Subject popularity
- Performance metrics
- Error tracking

This system provides a complete learning management platform with real-time engagement tracking and offline support, ready for educational institutions to deploy and scale.

<<<<<<< HEAD
# Exercise
this is my exericse app
=======
# 🏃 Stride — Exercise & Movement Tracker

**Stride** is a modern, responsive exercise-tracking web application built with a warm, modern visual design (deep forest green accents, off-white background, rounded cards, generous spacing, and subtle motion).

It features **local-first architecture**, allowing users to immediately log workouts offline without requiring an account, and seamlessly syncs to a private **Supabase PostgreSQL** database via a **NestJS REST API** when authenticated.

---

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Recharts, Lucide Icons, Canvas Confetti
- **Backend:** NestJS (Node.js & TypeScript), `@nestjs/swagger`, `class-validator`, `class-transformer`
- **Database & Auth:** Supabase PostgreSQL, Row Level Security (RLS), Supabase Email Magic Link Auth
- **Design System:** Custom CSS tokens, Warm Warm-toned palette (`#fbf9f4`, `#1b4332`, `#52b788`), responsive sidebar layout (desktop) and floating bottom navigation (mobile).

---

## 📁 Repository Structure

```
Exercise/
├── frontend/             # React + Vite + TypeScript web app
│   ├── src/
│   │   ├── components/   # Navbar, QuickLogModal, EditWorkoutModal, WorkoutCard, StatCard, Toast
│   │   ├── pages/        # Overview, ActivityLog, Progress, ExerciseFolder, Settings
│   │   ├── services/     # api.ts (NestJS client), storage.ts (Local-First), supabase.ts (Auth)
│   │   └── types/        # TypeScript interfaces for workouts, goals, auth
│   ├── .env.example      # Environment variables template for frontend
│   └── package.json
│
├── backend/              # NestJS REST API Server
│   ├── src/
│   │   ├── auth/         # SupabaseAuthGuard & CurrentUser decorator
│   │   ├── supabase/     # Supabase client service & token verification
│   │   ├── workouts/     # Controllers, Services, DTO validation schemas
│   │   ├── app.module.ts
│   │   └── main.ts       # Swagger docs setup, CORS, ValidationPipes
│   ├── .env.example      # Environment variables template for NestJS
│   └── package.json
│
└── supabase/             # Database migrations & security policies
    ├── schema.sql        # Table definitions, indexes, RLS policies, triggers
    └── setup-guide.md    # Step-by-step Supabase cloud project configuration
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js v18+ (tested on v24.19.0)
- npm v9+ (tested on 12.0.2)
- (Optional) Free [Supabase Account](https://supabase.com) for multi-device cloud sync

---

### Step 1: Start the Backend (NestJS)

```bash
cd backend
npm install
npm run start:dev
```
- The backend server will run on: `http://localhost:3000/api`
- Interactive Swagger API Documentation: `http://localhost:3000/api/docs`

---

### Step 2: Start the Frontend (Vite + React)

Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
- The frontend will launch at: `http://localhost:5173/`

---

## 🔐 Supabase Configuration Guide

To enable email magic-link sign-in and cloud database sync:

### 1. Execute SQL Migration in Supabase
1. Log in to your [Supabase Dashboard](https://app.supabase.com) and create a new project.
2. Go to the **SQL Editor** tab.
3. Paste the contents of `supabase/schema.sql` and click **Run**.
4. This creates:
   - `workouts` table with `user_id` referencing `auth.users(id)`
   - Indexes on `(user_id, date)` and `(user_id, type)`
   - Row Level Security (RLS) policies allowing users to CRUD *only their own records*.

### 2. Configure Auth Redirect URLs
1. In your Supabase Dashboard, navigate to **Authentication** -> **URL Configuration**.
2. Set **Site URL** to: `http://localhost:5173`
3. Under **Redirect URLs**, add: `http://localhost:5173/**`

### 3. Update Environment Variables

#### Backend (`backend/.env`):
```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-actual-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-supabase-service-role-key
FRONTEND_URL=http://localhost:5173
```

#### Frontend (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-supabase-anon-key
```

> ⚠️ **Security Note:** Never put `SUPABASE_SERVICE_ROLE_KEY` in `frontend/.env` or client browser code! The service-role key stays strictly inside the NestJS server environment.

---

## 🌟 Key Application Features

1. **Local-First & Offline Sync:** Log workouts anywhere without network lag. Local changes are saved instantly in `localStorage` / IndexedDB and safely pushed to NestJS when reconnected.
2. **Dynamic Workout Logging:**
   - **Run:** Date, Distance (km/mi), Duration (mins), Notes.
   - **Push-ups, Sit-ups, Squats:** Date, Sets, Reps per Set, Total Reps auto-calculation, Duration, Notes.
3. **Analytics & Progress Tracking:** Responsive Recharts visualization of volume progression over 7d/30d/90d/All-Time, exercise distribution, personal best records (PRs), and training streaks.
4. **Exercise Directory:** Dedicated cards for Run, Push-ups, Sit-ups, Squats with targeted muscle group guides, total statistics, and quick log triggers.
5. **Goal Setting & Unit Toggles:** Customize weekly target workout frequency and switch between Kilometres and Miles.
6. **API Security:** All NestJS API endpoints verify Supabase JWT tokens (`Authorization: Bearer <token>`) and derive user identity server-side without trusting client payload IDs.

---

## 📜 License
MIT License — Built for Stride Fitness
>>>>>>> c69ebd9 (feat: complete Stride workout tracking app with database sync, pace analytics, and dedicated exercise pages)

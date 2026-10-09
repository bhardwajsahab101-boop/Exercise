# Supabase Project Setup Guide for Stride

Follow this step-by-step guide to connect your Supabase project to the Stride NestJS backend and React frontend.

---

## 1. Create a Supabase Project

1. Go to [https://database.new](https://database.new) (or log in to [Supabase Console](https://app.supabase.com)).
2. Click **New Project**.
3. Choose your organization, project name (e.g. `stride-exercise-tracker`), database password, and preferred region.
4. Click **Create new project** and wait ~1 minute for provisioning.

---

## 2. Obtain Credentials

In your Supabase Dashboard:
1. Navigate to **Project Settings** -> **API**.
2. Copy the following keys:
   - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
   - **`anon` `public` key**
   - **`service_role` `secret` key**

---

## 3. Run Database Schema & RLS Migration

1. In Supabase Dashboard, go to **SQL Editor**.
2. Click **New Query**.
3. Open [`supabase/schema.sql`](file:///c:/Users/bhard/OneDrive/Desktop/Exercise/supabase/schema.sql) from this repository, copy its entire contents, and paste it into the SQL Editor.
4. Click **Run** (or press Ctrl + Enter).
5. Verify that:
   - The `workouts` table was created.
   - Indexes `idx_workouts_user_date` and `idx_workouts_user_type` were generated.
   - Row Level Security (RLS) is enabled with 4 policies (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) enforcing `auth.uid() = user_id`.

---

## 4. Configure Authentication & Redirect URLs

1. Go to **Authentication** -> **URL Configuration**.
2. Set **Site URL** to `http://localhost:5173`.
3. Add `http://localhost:5173/**` to **Redirect URLs**.
4. Go to **Authentication** -> **Email Templates** (optional: customize Magic Link email text).

---

## 5. Configure Local `.env` Files

### A. Backend Environment File (`backend/.env`):
Update `backend/.env` with your real keys:
```env
PORT=3000
NODE_ENV=development

SUPABASE_URL=https://<YOUR-PROJECT-REF>.supabase.co
SUPABASE_ANON_KEY=<YOUR-SUPABASE-ANON-KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR-SUPABASE-SERVICE-ROLE-KEY>

FRONTEND_URL=http://localhost:5173
```

### B. Frontend Environment File (`frontend/.env`):
Update `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://<YOUR-PROJECT-REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<YOUR-SUPABASE-ANON-KEY>
```

> 🚨 **Crucial Security Reminder:**
> Never place `SUPABASE_SERVICE_ROLE_KEY` in `frontend/.env` or frontend browser code!
> All database queries and token validations are handled through the NestJS backend API.

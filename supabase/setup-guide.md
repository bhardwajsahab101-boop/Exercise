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
> All database writes and token validations are handled through the NestJS backend API.

---

## 6. Migration 02: Family Sharing & Single-Owner Security

To secure your workouts to your owner account and enable read-only family sharing:

### A. Run Migration SQL in Supabase
1. In Supabase Dashboard, go to **SQL Editor** -> **New Query**.
2. Open [`supabase/migrations/02_family_sharing_and_owner_security.sql`](file:///c:/Users/bhard/OneDrive/Desktop/Exercise/supabase/migrations/02_family_sharing_and_owner_security.sql), copy its contents, and click **Run**.
3. This will:
   - Create `public.share_settings` table (stores SHA-256 token hash).
   - Enforce owner-only RLS policies on `workouts` and `share_settings`.
   - Revoke public/anonymous direct access to `workouts`.
   - Install the safe `public.get_shared_workouts_by_token(TEXT)` PostgreSQL RPC function.

### B. Disable Public Sign-ups in Supabase
1. In Supabase Dashboard, navigate to **Authentication** -> **Providers** -> **Email**.
2. Uncheck / Toggle OFF **"Allow new users to sign up"**.
3. Save changes. This ensures no external viewers or visitors can create an account in your project.

### C. Configure Owner User ID in `backend/.env`
1. Under **Authentication** -> **Users** in your Supabase Dashboard, copy your Owner User UUID.
2. In `backend/.env`, set:
   ```env
   OWNER_USER_ID=<YOUR-OWNER-UUID>
   ```
   (e.g., `OWNER_USER_ID=470af75f-61e0-40c9-b760-aab5730b9f94`)
3. Restart NestJS backend (`npm run start:dev`).

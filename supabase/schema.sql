-- ==========================================
-- Stride Exercise Tracker - Supabase SQL Schema
-- ==========================================

-- 1. Create enum for exercise types
CREATE TYPE exercise_type AS ENUM ('run', 'pushups', 'situps', 'squats');

-- 2. Create workouts table
CREATE TABLE IF NOT EXISTS public.workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type exercise_type NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Specific fields based on workout type:
    -- For 'run': distance_km (numeric) and duration_minutes (numeric)
    distance_km NUMERIC(6, 2) NULL CHECK (distance_km IS NULL OR distance_km >= 0),
    
    -- For 'pushups', 'situps', 'squats': sets and reps_per_set
    sets INTEGER NULL CHECK (sets IS NULL OR sets > 0),
    reps_per_set INTEGER NULL CHECK (reps_per_set IS NULL OR reps_per_set > 0),
    
    -- Optional duration and note for any exercise
    duration_minutes NUMERIC(6, 2) NULL CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
    notes TEXT NULL,
    
    -- Computed / helper column for total reps (sets * reps_per_set)
    total_reps INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN sets IS NOT NULL AND reps_per_set IS NOT NULL THEN sets * reps_per_set
            ELSE NULL
        END
    ) STORED,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for fast user-level lookups and date range filtering
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workouts (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_user_type ON public.workouts (user_id, type);

-- 4. Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workouts_updated_at
    BEFORE UPDATE ON public.workouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: Users can only see, insert, update, and delete their own records
CREATE POLICY "Users can view own workouts"
    ON public.workouts
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts"
    ON public.workouts
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts"
    ON public.workouts
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts"
    ON public.workouts
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Explicitly revoke public / anon direct privileges on workouts
REVOKE ALL ON public.workouts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;

-- ==========================================
-- 7. Family Sharing Settings Table (Token Hash)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.share_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_share_settings_token_hash 
    ON public.share_settings (token_hash) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_share_settings_user_id 
    ON public.share_settings (user_id);

CREATE TRIGGER update_share_settings_updated_at
    BEFORE UPDATE ON public.share_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.share_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own share settings"
    ON public.share_settings
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own share settings"
    ON public.share_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own share settings"
    ON public.share_settings
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own share settings"
    ON public.share_settings
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

REVOKE ALL ON public.share_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_settings TO authenticated;

-- ==========================================
-- 8. Safe Read-Only Family Sharing RPC Function
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_shared_workouts_by_token(p_token_hash TEXT)
RETURNS TABLE (
    id UUID,
    type exercise_type,
    date DATE,
    distance_km NUMERIC(6, 2),
    sets INTEGER,
    reps_per_set INTEGER,
    total_reps INTEGER,
    duration_minutes NUMERIC(6, 2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT s.user_id INTO v_user_id
    FROM public.share_settings s
    WHERE s.token_hash = p_token_hash
      AND s.is_active = true
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        w.id,
        w.type,
        w.date,
        w.distance_km,
        w.sets,
        w.reps_per_set,
        w.total_reps,
        w.duration_minutes
    FROM public.workouts w
    WHERE w.user_id = v_user_id
    ORDER BY w.date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_workouts_by_token(TEXT) TO anon, authenticated;


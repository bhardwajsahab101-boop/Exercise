-- ==============================================================================
-- Stride Migration 02: Family Sharing & Owner-Only Access Security
-- ==============================================================================

-- 1. Create share_settings table to store SHA-256 hashed share tokens
CREATE TABLE IF NOT EXISTS public.share_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ NULL
);

-- Fast lookup index for active share tokens
CREATE INDEX IF NOT EXISTS idx_share_settings_token_hash 
    ON public.share_settings (token_hash) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_share_settings_user_id 
    ON public.share_settings (user_id);

-- Automatically update updated_at timestamp on share_settings
CREATE TRIGGER update_share_settings_updated_at
    BEFORE UPDATE ON public.share_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Enable Row Level Security (RLS) on share_settings
ALTER TABLE public.share_settings ENABLE ROW LEVEL SECURITY;

-- Drop prior policies if running repeatedly
DROP POLICY IF EXISTS "Owner can view own share settings" ON public.share_settings;
DROP POLICY IF EXISTS "Owner can insert own share settings" ON public.share_settings;
DROP POLICY IF EXISTS "Owner can update own share settings" ON public.share_settings;
DROP POLICY IF EXISTS "Owner can delete own share settings" ON public.share_settings;

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

-- Revoke direct anon access to share_settings
REVOKE ALL ON public.share_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_settings TO authenticated;

-- 3. Enforce Owner-Only Access on workouts table
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Revoke all direct privileges on workouts from anonymous viewers
REVOKE ALL ON public.workouts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;

-- Ensure RLS policies only allow authenticated owner to manage workouts
DROP POLICY IF EXISTS "Users can view own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can insert own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can delete own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Owner can view own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Owner can insert own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Owner can update own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Owner can delete own workouts" ON public.workouts;

CREATE POLICY "Owner can view own workouts"
    ON public.workouts
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own workouts"
    ON public.workouts
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own workouts"
    ON public.workouts
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own workouts"
    ON public.workouts
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. Secure RPC function for Read-Only Family Sharing
-- SECURITY DEFINER allows the function to execute safely and read workouts
-- only when a valid, active SHA-256 token hash matches share_settings.
-- Strictly excludes notes, user_id, email, and user account metadata.
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
    -- Verify active share token
    SELECT s.user_id INTO v_user_id
    FROM public.share_settings s
    WHERE s.token_hash = p_token_hash
      AND s.is_active = true
    LIMIT 1;

    -- If no valid token found, return empty result
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Return only safe columns for owner workouts, ordered by date descending
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

-- Grant execution of the safe query function to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_shared_workouts_by_token(TEXT) TO anon, authenticated;

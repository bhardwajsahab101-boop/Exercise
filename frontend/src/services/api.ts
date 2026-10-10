import type {
  Workout,
  SharedProgressPayload,
  ShareStatusResponse,
  GenerateShareResponse,
} from '../types/workout';
import { supabase } from './supabase';
import {
  generateSecureToken,
  hashToken,
  buildSharedProgressPayload,
} from '../utils/sharedMetrics';

/**
 * Resolves the backend API base URL
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && !envUrl.includes('placeholder')) {
    return envUrl.trim().replace(/\/$/, '');
  }

  if (
    import.meta.env.PROD ||
    (typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1')
  ) {
    return `${window.location.origin}/api`;
  }

  return 'http://localhost:3000/api';
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.access_token) {
      headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
    }
  } catch (e) {
    // Ignore session errors
  }
  return headers;
};

export const api = {
  /**
   * Fetch workouts for the signed-in user from the NestJS REST API
   */
  async getWorkouts(): Promise<Workout[]> {
    const headers = await getAuthHeaders();
    if (!headers['Authorization']) {
      return [];
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/workouts`, { headers });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Failed to fetch workouts: HTTP ${res.status}`);
      }

      const data = await res.json();
      return (data || []).map((w: any) => ({ ...w, synced: true }));
    } catch (err: any) {
      console.error('getWorkouts error:', err);
      throw err;
    }
  },

  /**
   * Create a new workout via NestJS API (persisted to Supabase PostgreSQL)
   */
  async createWorkout(workoutData: Partial<Workout>): Promise<Workout> {
    const headers = await getAuthHeaders();
    if (!headers['Authorization']) {
      throw new Error('Please sign in with email to save workouts to the cloud database.');
    }

    const payload: Record<string, any> = {
      type: workoutData.type,
      date: workoutData.date || new Date().toISOString().split('T')[0],
      distance_km: workoutData.type === 'run' && workoutData.distance_km ? Number(workoutData.distance_km) : undefined,
      sets: workoutData.type !== 'run' && workoutData.sets ? Number(workoutData.sets) : undefined,
      reps_per_set: workoutData.type !== 'run' && workoutData.reps_per_set ? Number(workoutData.reps_per_set) : undefined,
      total_reps: workoutData.total_reps ? Number(workoutData.total_reps) : undefined,
      duration_minutes: workoutData.duration_minutes ? Number(workoutData.duration_minutes) : undefined,
      notes: workoutData.notes ? workoutData.notes.trim() : undefined,
    };

    // Remove undefined fields
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    try {
      const res = await fetch(`${getApiBaseUrl()}/workouts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Failed to save workout: HTTP ${res.status}`);
      }

      const data = await res.json();
      return { ...data, synced: true };
    } catch (err: any) {
      console.error('createWorkout error:', err);
      throw err;
    }
  },

  /**
   * Update an existing workout entry via NestJS API
   */
  async updateWorkout(id: string, patch: Partial<Workout>): Promise<Workout> {
    const headers = await getAuthHeaders();
    if (!headers['Authorization']) {
      throw new Error('Please sign in to update workouts.');
    }

    const payload: Record<string, any> = {
      date: patch.date,
      distance_km: patch.type === 'run' && patch.distance_km !== undefined ? (patch.distance_km ? Number(patch.distance_km) : null) : undefined,
      sets: patch.sets !== undefined ? (patch.sets ? Number(patch.sets) : null) : undefined,
      reps_per_set: patch.reps_per_set !== undefined ? (patch.reps_per_set ? Number(patch.reps_per_set) : null) : undefined,
      duration_minutes: patch.duration_minutes !== undefined ? (patch.duration_minutes ? Number(patch.duration_minutes) : null) : undefined,
      notes: patch.notes !== undefined ? (patch.notes ? patch.notes.trim() : null) : undefined,
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    try {
      const res = await fetch(`${getApiBaseUrl()}/workouts/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Failed to update workout: HTTP ${res.status}`);
      }

      const data = await res.json();
      return { ...data, synced: true };
    } catch (err: any) {
      console.error('updateWorkout error:', err);
      throw err;
    }
  },

  /**
   * Delete a workout entry via NestJS API
   */
  async deleteWorkout(id: string): Promise<boolean> {
    const headers = await getAuthHeaders();
    if (!headers['Authorization']) {
      throw new Error('Please sign in to delete workouts.');
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/workouts/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok && res.status !== 204) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Failed to delete workout: HTTP ${res.status}`);
      }

      return true;
    } catch (err: any) {
      console.error('deleteWorkout error:', err);
      throw err;
    }
  },

  /**
   * Batch sync unsynced local workouts to NestJS API
   */
  async syncBatch(localWorkouts: Workout[]): Promise<{ syncedCount: number }> {
    const unsynced = localWorkouts.filter((w) => !w.synced);
    if (unsynced.length === 0) {
      return { syncedCount: 0 };
    }

    const headers = await getAuthHeaders();
    if (!headers['Authorization']) {
      throw new Error('Authentication required: please sign in with email before syncing.');
    }

    const payload = unsynced.map((w) => ({
      type: w.type,
      date: w.date,
      distance_km: w.distance_km ? Number(w.distance_km) : undefined,
      sets: w.sets ? Number(w.sets) : undefined,
      reps_per_set: w.reps_per_set ? Number(w.reps_per_set) : undefined,
      total_reps: w.total_reps ? Number(w.total_reps) : undefined,
      duration_minutes: w.duration_minutes ? Number(w.duration_minutes) : undefined,
      notes: w.notes ? w.notes.trim() : undefined,
    }));

    try {
      const res = await fetch(`${getApiBaseUrl()}/workouts/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ workouts: payload }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Batch sync failed: HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: any) {
      console.error('syncBatch error:', err);
      throw err;
    }
  },

  // ==========================================
  // Family Sharing API Methods (Supabase Direct)
  // ==========================================

  /**
   * Get current owner share status directly from Supabase share_settings table.
   */
  async getShareStatus(): Promise<ShareStatusResponse> {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      return { hasActiveShare: false, createdAt: null };
    }

    const userId = sessionData.session.user.id;
    const { data, error } = await supabase
      .from('share_settings')
      .select('id, created_at, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        hasActiveShare: true,
        createdAt: data.created_at,
      };
    }

    return {
      hasActiveShare: false,
      createdAt: null,
    };
  },

  /**
   * Generate or regenerate a cryptographically secure share link for the owner.
   * Stores ONLY the SHA-256 hash in Supabase, deactivates older tokens,
   * and returns the full share URL formatted with the current origin.
   */
  async generateShareLink(): Promise<GenerateShareResponse> {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      throw new Error('Please connect Supabase with your owner account to manage family sharing.');
    }

    const userId = sessionData.session.user.id;
    const rawToken = generateSecureToken();
    const tokenHash = await hashToken(rawToken);
    const nowIso = new Date().toISOString();

    // 1. Deactivate any previously active share tokens for this owner
    await supabase
      .from('share_settings')
      .update({ is_active: false, revoked_at: nowIso })
      .eq('user_id', userId)
      .eq('is_active', true);

    // 2. Insert new active share record with hashed token
    const { error: insertErr } = await supabase.from('share_settings').insert({
      user_id: userId,
      token_hash: tokenHash,
      is_active: true,
      created_at: nowIso,
    });

    if (insertErr) {
      console.error('Supabase share_settings insert error:', insertErr);
      throw new Error(insertErr.message || 'Failed to save share settings in Supabase');
    }

    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin.replace(/\/$/, '')
        : 'https://exercise.launchstack.in';
    const shareUrl = `${origin}/share/${rawToken}`;

    return {
      token: rawToken,
      shareUrl,
      createdAt: nowIso,
    };
  },

  /**
   * Revoke active share link in Supabase.
   * Sets is_active = false and records revoked_at timestamp.
   */
  async revokeShareLink(): Promise<{ success: boolean; message: string }> {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      throw new Error('Please connect Supabase with your owner account to manage family sharing.');
    }

    const userId = sessionData.session.user.id;
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('share_settings')
      .update({ is_active: false, revoked_at: nowIso })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Supabase share_settings revoke error:', error);
      throw new Error(error.message || 'Failed to revoke share link');
    }

    return {
      success: true,
      message: 'Share link has been revoked. Viewers will no longer have access.',
    };
  },

  /**
   * Public family viewer: Fetch progress and running history via share token.
   * Uses existing safe PostgreSQL RPC function `get_shared_workouts_by_token(p_token_hash)`.
   * Does NOT require user authentication or expose private workouts table directly.
   */
  async getSharedProgress(token: string): Promise<SharedProgressPayload> {
    if (!token || token.trim().length < 16) {
      throw new Error('This share link is invalid or has expired.');
    }

    const tokenHash = await hashToken(token);

    // Call the safe, SECURITY DEFINER PostgreSQL RPC function
    const { data, error } = await supabase.rpc('get_shared_workouts_by_token', {
      p_token_hash: tokenHash,
    });

    if (error) {
      console.error('Safe RPC lookup error:', error);
      throw new Error('This share link is invalid or has expired.');
    }

    // If the token is invalid or inactive, the RPC returns an empty array.
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('This share link is invalid or has expired.');
    }

    // Compute progress analytics, weekly/monthly comparisons, trends, and personal bests
    return buildSharedProgressPayload(data);
  },
};

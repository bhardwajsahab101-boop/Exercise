import type {
  Workout,
  SharedProgressPayload,
  ShareStatusResponse,
  GenerateShareResponse,
} from '../types/workout';
import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Helper to determine if NestJS backend API is configured
const isCustomApiConfigured = () => {
  return Boolean(API_BASE) && !API_BASE.includes('placeholder');
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
   * Fetch workouts for the signed-in user from NestJS API (or Supabase direct fallback)
   */
  async getWorkouts(): Promise<Workout[]> {
    if (isCustomApiConfigured()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/workouts`, { headers });
        if (res.ok) {
          const data = await res.json();
          return data.map((w: any) => ({ ...w, synced: true }));
        }
      } catch (e) {
        console.warn('API fetch failed, falling back to direct Supabase query:', e);
      }
    }

    // Direct Supabase Query with RLS
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      return [];
    }

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(error.message);
    }

    return (data || []).map((w) => ({ ...w, synced: true }));
  },

  /**
   * Create a new workout via NestJS API (or Supabase fallback)
   */
  async createWorkout(workoutData: Partial<Workout>): Promise<Workout> {
    if (isCustomApiConfigured()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/workouts`, {
          method: 'POST',
          headers,
          body: JSON.stringify(workoutData),
        });
        if (res.ok) {
          const resData = await res.json();
          return { ...resData, synced: true };
        } else {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || `API create failed with status ${res.status}`);
        }
      } catch (e: any) {
        console.warn('API create failed, attempting direct Supabase insert:', e.message);
        if (e.message && e.message.includes('owner')) {
          throw e; // Don't bypass owner permission rejection
        }
      }
    }

    // Direct Supabase Insert (RLS enforced)
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      throw new Error('Please sign in to save workouts to your Supabase cloud account.');
    }

    const userId = sessionData.session.user.id;

    const payload: Record<string, any> = {
      user_id: userId,
      type: workoutData.type,
      date: workoutData.date || new Date().toISOString().split('T')[0],
      distance_km: workoutData.type === 'run' && workoutData.distance_km ? Number(workoutData.distance_km) : null,
      sets: workoutData.type !== 'run' && workoutData.sets ? Number(workoutData.sets) : null,
      reps_per_set: workoutData.type !== 'run' && workoutData.reps_per_set ? Number(workoutData.reps_per_set) : null,
      duration_minutes: workoutData.duration_minutes ? Number(workoutData.duration_minutes) : null,
      notes: workoutData.notes ? workoutData.notes.trim() : null,
    };

    const { data, error } = await supabase
      .from('workouts')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('Supabase Insert Error:', error);
      throw new Error(error.message || 'Failed to insert workout into Supabase');
    }

    return { ...data, synced: true };
  },

  /**
   * Update an existing workout entry via NestJS API (or Supabase fallback)
   */
  async updateWorkout(id: string, patch: Partial<Workout>): Promise<Workout> {
    if (isCustomApiConfigured()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/workouts/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          const resData = await res.json();
          return { ...resData, synced: true };
        } else {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || `API update failed with status ${res.status}`);
        }
      } catch (e: any) {
        console.warn('API update failed, attempting direct Supabase update:', e.message);
        if (e.message && e.message.includes('owner')) {
          throw e;
        }
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      throw new Error('Please sign in to update workouts in Supabase.');
    }

    const payload: Record<string, any> = {
      date: patch.date,
      duration_minutes:
        patch.duration_minutes !== undefined ? (patch.duration_minutes ? Number(patch.duration_minutes) : null) : undefined,
      notes: patch.notes !== undefined ? (patch.notes ? patch.notes.trim() : null) : undefined,
      updated_at: new Date().toISOString(),
    };

    if (patch.type === 'run' || patch.distance_km !== undefined) {
      payload.distance_km = patch.distance_km ? Number(patch.distance_km) : null;
    }
    if (patch.sets !== undefined) {
      payload.sets = patch.sets ? Number(patch.sets) : null;
    }
    if (patch.reps_per_set !== undefined) {
      payload.reps_per_set = patch.reps_per_set ? Number(patch.reps_per_set) : null;
    }

    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

    const { data, error } = await supabase
      .from('workouts')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Supabase Update Error:', error);
      throw new Error(error.message || 'Failed to update workout');
    }

    return { ...data, synced: true };
  },

  /**
   * Delete a workout entry via NestJS API (or Supabase fallback)
   */
  async deleteWorkout(id: string): Promise<boolean> {
    if (isCustomApiConfigured()) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/workouts/${id}`, {
          method: 'DELETE',
          headers,
        });
        if (res.ok) {
          return true;
        } else {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message || `API delete failed with status ${res.status}`);
        }
      } catch (e: any) {
        console.warn('API delete failed, attempting direct Supabase deletion:', e.message);
        if (e.message && e.message.includes('owner')) {
          throw e;
        }
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      throw new Error('Please sign in to delete workouts from Supabase.');
    }

    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase Delete Error:', error);
      throw new Error(error.message || 'Failed to delete workout');
    }

    return true;
  },

  /**
   * Batch sync unsynced local workouts to Supabase
   */
  async syncBatch(localWorkouts: Workout[]): Promise<{ syncedCount: number }> {
    let count = 0;
    for (const w of localWorkouts) {
      if (!w.synced) {
        await this.createWorkout(w);
        count++;
      }
    }
    return { syncedCount: count };
  },

  // ==========================================
  // Family Sharing API Methods
  // ==========================================

  /**
   * Get current owner share status
   */
  async getShareStatus(): Promise<ShareStatusResponse> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/share/status`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to retrieve sharing status');
    }
    return res.json();
  },

  /**
   * Generate or regenerate a random share link for the owner
   */
  async generateShareLink(): Promise<GenerateShareResponse> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/share/generate`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate share link');
    }
    return res.json();
  },

  /**
   * Revoke active share link
   */
  async revokeShareLink(): Promise<{ success: boolean; message: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/share/revoke`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to revoke share link');
    }
    return res.json();
  },

  /**
   * Public family viewer: Fetch progress and running history via share token
   * Does not require authentication.
   */
  async getSharedProgress(token: string): Promise<SharedProgressPayload> {
    const res = await fetch(`${API_BASE}/share/${token}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Invalid or expired share link');
    }
    return res.json();
  },
};

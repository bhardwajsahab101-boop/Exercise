import type { Workout } from '../types/workout';
import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      headers['Authorization'] = `Bearer ${data.session.access_token}`;
    }
  } catch (e) {
    // Auth not initialized or offline
  }

  return headers;
}

export const api = {
  async getWorkouts(params?: { type?: string; start_date?: string; end_date?: string; query?: string }): Promise<Workout[]> {
    const headers = await getAuthHeaders();
    const queryParams = new URLSearchParams();
    if (params?.type && params.type !== 'all') queryParams.append('type', params.type);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.query) queryParams.append('query', params.query);

    const url = `${API_BASE}/workouts?${queryParams.toString()}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch workouts (${res.status})`);
    }
    return res.json();
  },

  async createWorkout(workout: Partial<Workout>): Promise<Workout> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/workouts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(workout),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to create workout' }));
      throw new Error(err.message || 'Failed to create workout');
    }
    return res.json();
  },

  async updateWorkout(id: string, workout: Partial<Workout>): Promise<Workout> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/workouts/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(workout),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to update workout' }));
      throw new Error(err.message || 'Failed to update workout');
    }
    return res.json();
  },

  async deleteWorkout(id: string): Promise<boolean> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/workouts/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      throw new Error(`Failed to delete workout (${res.status})`);
    }
    return true;
  },

  async syncBatch(workouts: Workout[]): Promise<{ syncedCount: number; errors?: any[] }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/workouts/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ workouts }),
    });
    if (!res.ok) {
      throw new Error(`Sync failed (${res.status})`);
    }
    return res.json();
  },
};

import type { Workout, UserGoal } from '../types/workout';

const WORKOUTS_KEY = 'stride_workouts_v1';
const GOALS_KEY = 'stride_user_goals_v1';

export const getLocalWorkouts = (): Workout[] => {
  try {
    const raw = localStorage.getItem(WORKOUTS_KEY);
    if (!raw) {
      // User requested NO auto-added fake data; start empty
      localStorage.setItem(WORKOUTS_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local workouts:', err);
    return [];
  }
};

export const saveLocalWorkouts = (workouts: Workout[]) => {
  try {
    localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
  } catch (err) {
    console.error('Error saving local workouts:', err);
  }
};

export const addLocalWorkout = (workoutData: Partial<Workout>): Workout => {
  const existing = getLocalWorkouts();
  const totalReps =
    workoutData.sets && workoutData.reps_per_set
      ? Number(workoutData.sets) * Number(workoutData.reps_per_set)
      : workoutData.total_reps || null;

  const newWorkout: Workout = {
    id: workoutData.id || `loc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: workoutData.type || 'run',
    date: workoutData.date || new Date().toISOString().split('T')[0],
    distance_km: workoutData.distance_km ? Number(workoutData.distance_km) : null,
    sets: workoutData.sets ? Number(workoutData.sets) : null,
    reps_per_set: workoutData.reps_per_set ? Number(workoutData.reps_per_set) : null,
    total_reps: totalReps,
    duration_minutes: workoutData.duration_minutes ? Number(workoutData.duration_minutes) : null,
    notes: workoutData.notes || null,
    created_at: workoutData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    synced: workoutData.synced ?? false,
  };

  const updated = [newWorkout, ...existing];
  saveLocalWorkouts(updated);
  return newWorkout;
};

export const updateLocalWorkout = (id: string, patch: Partial<Workout>): Workout | null => {
  const existing = getLocalWorkouts();
  const index = existing.findIndex((w) => w.id === id);
  if (index === -1) return null;

  const current = existing[index];
  const sets = patch.sets !== undefined ? (patch.sets ? Number(patch.sets) : null) : current.sets;
  const repsPerSet = patch.reps_per_set !== undefined ? (patch.reps_per_set ? Number(patch.reps_per_set) : null) : current.reps_per_set;
  const totalReps = sets && repsPerSet ? sets * repsPerSet : patch.total_reps !== undefined ? patch.total_reps : current.total_reps;

  const updatedItem: Workout = {
    ...current,
    ...patch,
    sets,
    reps_per_set: repsPerSet,
    total_reps: totalReps,
    distance_km: patch.distance_km !== undefined ? (patch.distance_km ? Number(patch.distance_km) : null) : current.distance_km,
    duration_minutes: patch.duration_minutes !== undefined ? (patch.duration_minutes ? Number(patch.duration_minutes) : null) : current.duration_minutes,
    updated_at: new Date().toISOString(),
    synced: false,
  };

  existing[index] = updatedItem;
  saveLocalWorkouts(existing);
  return updatedItem;
};

export const deleteLocalWorkout = (id: string): boolean => {
  const existing = getLocalWorkouts();
  const filtered = existing.filter((w) => w.id !== id);
  if (filtered.length === existing.length) return false;
  saveLocalWorkouts(filtered);
  return true;
};

export const clearAllLocalWorkouts = (): void => {
  try {
    localStorage.setItem(WORKOUTS_KEY, JSON.stringify([]));
  } catch (err) {
    console.error('Error clearing workouts:', err);
  }
};

export const getLocalGoals = (): UserGoal => {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return { weekly_target: 3, unit_distance: 'km' };
};

export const saveLocalGoals = (goals: UserGoal) => {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch (err) {
    console.error('Error saving user goals:', err);
  }
};

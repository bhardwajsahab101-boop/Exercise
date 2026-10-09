export type ExerciseType = 'run' | 'pushups' | 'situps' | 'squats';

export interface Workout {
  id: string;
  user_id?: string;
  type: ExerciseType;
  date: string; // YYYY-MM-DD
  distance_km?: number | null;
  sets?: number | null;
  reps_per_set?: number | null;
  total_reps?: number | null;
  duration_minutes?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  synced?: boolean; // For offline local-first sync tracking
}

export interface WorkoutFormData {
  type: ExerciseType;
  date: string;
  distance_km: string;
  sets: string;
  reps_per_set: string;
  duration_minutes: string;
  notes: string;
}

export interface UserGoal {
  weekly_target: number; // e.g. 5 workouts
  unit_distance: 'km' | 'mi';
}

export interface UserProfile {
  email?: string;
  id?: string;
  authenticated: boolean;
}

export interface PersonalRecord {
  exercise: ExerciseType;
  value: number; // km for run, total reps or reps/set for others
  unit: string;
  date: string;
}

export interface WeeklySummary {
  total_workouts: number;
  total_distance_km: number;
  total_reps: number;
  total_duration_minutes: number;
  weekly_goal: number;
  goal_progress_percent: number;
  current_streak_days: number;
}

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

export interface SharedWorkoutItem {
  id: string;
  type: ExerciseType;
  date: string;
  distance_km?: number | null;
  sets?: number | null;
  reps_per_set?: number | null;
  total_reps?: number | null;
  duration_minutes?: number | null;
}

export interface ComparisonMetric {
  current_period: number;
  previous_period: number;
  difference: number;
  percent_change: number | null;
}

export interface SharedProgressComparisons {
  week_distance_km: ComparisonMetric;
  week_workouts: ComparisonMetric;
  week_duration_minutes: ComparisonMetric;
  month_distance_km: ComparisonMetric;
  month_workouts: ComparisonMetric;
  month_duration_minutes: ComparisonMetric;
}

export interface SharedPersonalBests {
  longest_run_km: number;
  fastest_pace_min_km: string;
  max_pushups_reps: number;
  max_situps_reps: number;
  max_squats_reps: number;
}

export interface WeeklyTrendBucket {
  week_label: string;
  start_date: string;
  distance_km: number;
  workouts: number;
  duration_minutes: number;
}

export interface MonthlyTrendBucket {
  month_label: string;
  distance_km: number;
  workouts: number;
  duration_minutes: number;
}

export interface SharedProgressSummary {
  total_workouts: number;
  total_distance_km: number;
  total_duration_minutes: number;
  total_runs: number;
  total_strength_reps: number;
  active_days: number;
}

export interface SharedProgressPayload {
  valid: boolean;
  summary: SharedProgressSummary;
  comparisons: SharedProgressComparisons;
  personal_bests: SharedPersonalBests;
  weekly_trends: WeeklyTrendBucket[];
  monthly_trends: MonthlyTrendBucket[];
  recent_runs: SharedWorkoutItem[];
  all_workouts: SharedWorkoutItem[];
}

export interface ShareStatusResponse {
  hasActiveShare: boolean;
  createdAt?: string | null;
}

export interface GenerateShareResponse {
  token: string;
  shareUrl: string;
  createdAt: string;
}


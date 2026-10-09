export interface SharedWorkoutItem {
  id: string;
  type: string;
  date: string;
  distance_km?: number | null;
  sets?: number | null;
  reps_per_set?: number | null;
  total_reps?: number | null;
  duration_minutes?: number | null;
}

export interface SharedProgressSummary {
  total_workouts: number;
  total_distance_km: number;
  total_duration_minutes: number;
  total_runs: number;
  total_strength_reps: number;
  active_days: number;
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

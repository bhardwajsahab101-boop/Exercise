import type {
  SharedWorkoutItem,
  SharedProgressSummary,
  SharedProgressComparisons,
  SharedPersonalBests,
  WeeklyTrendBucket,
  MonthlyTrendBucket,
  SharedProgressPayload,
  ComparisonMetric,
} from '../types/workout';

/**
 * Generate a cryptographically secure 64-character hex token in the browser.
 */
export function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    // Fallback if running outside standard browser window
    for (let i = 0; i < 32; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute SHA-256 hash string from a raw token using Web Crypto API.
 */
export async function hashToken(rawToken: string): Promise<string> {
  const trimmed = rawToken.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(trimmed);

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('Web Crypto API is not supported in this environment');
}

/**
 * Sanitizes raw database rows from RPC into strongly typed SharedWorkoutItem records.
 */
export function sanitizeSharedWorkouts(rows: any[]): SharedWorkoutItem[] {
  return (rows || []).map((w) => ({
    id: w.id,
    type: w.type,
    date: w.date,
    distance_km: w.distance_km !== null && w.distance_km !== undefined ? Number(w.distance_km) : null,
    sets: w.sets !== null && w.sets !== undefined ? Number(w.sets) : null,
    reps_per_set: w.reps_per_set !== null && w.reps_per_set !== undefined ? Number(w.reps_per_set) : null,
    total_reps: w.total_reps !== null && w.total_reps !== undefined ? Number(w.total_reps) : null,
    duration_minutes:
      w.duration_minutes !== null && w.duration_minutes !== undefined ? Number(w.duration_minutes) : null,
  }));
}

/**
 * Calculate comparisons across current vs previous 7-day and 30-day periods.
 */
export function calculateComparisons(workouts: SharedWorkoutItem[]): SharedProgressComparisons {
  const now = new Date();

  const d7 = new Date(now);
  d7.setDate(now.getDate() - 7);
  const d14 = new Date(now);
  d14.setDate(now.getDate() - 14);

  const d30 = new Date(now);
  d30.setDate(now.getDate() - 30);
  const d60 = new Date(now);
  d60.setDate(now.getDate() - 60);

  // Current 7 days vs previous 7 days
  const currentWeekWorkouts = workouts.filter((w) => {
    const dt = new Date(w.date + 'T00:00:00');
    return dt >= d7;
  });

  const prevWeekWorkouts = workouts.filter((w) => {
    const dt = new Date(w.date + 'T00:00:00');
    return dt >= d14 && dt < d7;
  });

  // Current 30 days vs previous 30 days
  const currentMonthWorkouts = workouts.filter((w) => {
    const dt = new Date(w.date + 'T00:00:00');
    return dt >= d30;
  });

  const prevMonthWorkouts = workouts.filter((w) => {
    const dt = new Date(w.date + 'T00:00:00');
    return dt >= d60 && dt < d30;
  });

  const buildMetric = (curr: number, prev: number): ComparisonMetric => {
    const diff = curr - prev;
    let pct: number | null = null;
    if (prev > 0) {
      pct = Number(((diff / prev) * 100).toFixed(1));
    } else if (curr > 0) {
      pct = 100;
    }
    return {
      current_period: Number(curr.toFixed(2)),
      previous_period: Number(prev.toFixed(2)),
      difference: Number(diff.toFixed(2)),
      percent_change: pct,
    };
  };

  return {
    week_distance_km: buildMetric(
      currentWeekWorkouts.reduce((a, b) => a + (b.distance_km || 0), 0),
      prevWeekWorkouts.reduce((a, b) => a + (b.distance_km || 0), 0),
    ),
    week_workouts: buildMetric(currentWeekWorkouts.length, prevWeekWorkouts.length),
    week_duration_minutes: buildMetric(
      currentWeekWorkouts.reduce((a, b) => a + (b.duration_minutes || 0), 0),
      prevWeekWorkouts.reduce((a, b) => a + (b.duration_minutes || 0), 0),
    ),
    month_distance_km: buildMetric(
      currentMonthWorkouts.reduce((a, b) => a + (b.distance_km || 0), 0),
      prevMonthWorkouts.reduce((a, b) => a + (b.distance_km || 0), 0),
    ),
    month_workouts: buildMetric(currentMonthWorkouts.length, prevMonthWorkouts.length),
    month_duration_minutes: buildMetric(
      currentMonthWorkouts.reduce((a, b) => a + (b.duration_minutes || 0), 0),
      prevMonthWorkouts.reduce((a, b) => a + (b.duration_minutes || 0), 0),
    ),
  };
}

/**
 * Calculate personal bests (longest run, fastest pace, max reps).
 */
export function calculatePersonalBests(workouts: SharedWorkoutItem[]): SharedPersonalBests {
  let longestRunKm = 0;
  let fastestPaceSec = Infinity;
  let fastestPaceStr = '--:--';
  let maxPushups = 0;
  let maxSitups = 0;
  let maxSquats = 0;

  workouts.forEach((w) => {
    if (w.type === 'run') {
      const dist = w.distance_km || 0;
      const dur = w.duration_minutes || 0;
      if (dist > longestRunKm) longestRunKm = dist;
      if (dist > 0 && dur > 0) {
        const pacePerKmMin = dur / dist;
        if (pacePerKmMin < fastestPaceSec && pacePerKmMin >= 2.0) {
          fastestPaceSec = pacePerKmMin;
          const mins = Math.floor(pacePerKmMin);
          const secs = Math.round((pacePerKmMin - mins) * 60);
          fastestPaceStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
      }
    } else if (w.type === 'pushups') {
      const reps = w.total_reps || (w.sets && w.reps_per_set ? w.sets * w.reps_per_set : 0);
      if (reps > maxPushups) maxPushups = reps;
    } else if (w.type === 'situps') {
      const reps = w.total_reps || (w.sets && w.reps_per_set ? w.sets * w.reps_per_set : 0);
      if (reps > maxSitups) maxSitups = reps;
    } else if (w.type === 'squats') {
      const reps = w.total_reps || (w.sets && w.reps_per_set ? w.sets * w.reps_per_set : 0);
      if (reps > maxSquats) maxSquats = reps;
    }
  });

  return {
    longest_run_km: Number(longestRunKm.toFixed(2)),
    fastest_pace_min_km: fastestPaceStr,
    max_pushups_reps: maxPushups,
    max_situps_reps: maxSitups,
    max_squats_reps: maxSquats,
  };
}

/**
 * Group workouts into weekly trend buckets for charts (last 6 weeks).
 */
export function calculateWeeklyTrends(workouts: SharedWorkoutItem[]): WeeklyTrendBucket[] {
  const bucketsMap = new Map<
    string,
    { label: string; startDate: string; distance: number; count: number; duration: number }
  >();

  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i * 7);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const key = `w-${i}`;
    bucketsMap.set(key, {
      label: `${month} ${day}`,
      startDate: d.toISOString().split('T')[0],
      distance: 0,
      count: 0,
      duration: 0,
    });
  }

  workouts.forEach((w) => {
    const wDate = new Date(w.date + 'T00:00:00');
    const diffDays = Math.floor((today.getTime() - wDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 42) {
      const weekIdx = Math.floor(diffDays / 7);
      const key = `w-${weekIdx}`;
      const b = bucketsMap.get(key);
      if (b) {
        b.distance += w.distance_km || 0;
        b.count += 1;
        b.duration += w.duration_minutes || 0;
      }
    }
  });

  return Array.from(bucketsMap.values()).map((b) => ({
    week_label: b.label,
    start_date: b.startDate,
    distance_km: Number(b.distance.toFixed(2)),
    workouts: b.count,
    duration_minutes: Number(b.duration.toFixed(1)),
  }));
}

/**
 * Group workouts into monthly trend buckets for charts.
 */
export function calculateMonthlyTrends(workouts: SharedWorkoutItem[]): MonthlyTrendBucket[] {
  const map = new Map<string, { label: string; distance: number; count: number; duration: number }>();

  workouts.forEach((w) => {
    const d = new Date(w.date + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const current = map.get(label) || { label, distance: 0, count: 0, duration: 0 };
    current.distance += w.distance_km || 0;
    current.count += 1;
    current.duration += w.duration_minutes || 0;
    map.set(label, current);
  });

  return Array.from(map.values()).map((m) => ({
    month_label: m.label,
    distance_km: Number(m.distance.toFixed(2)),
    workouts: m.count,
    duration_minutes: Number(m.duration.toFixed(1)),
  }));
}

/**
 * Builds the complete SharedProgressPayload object from an array of workout rows.
 */
export function buildSharedProgressPayload(rawWorkouts: any[]): SharedProgressPayload {
  const safeWorkouts = sanitizeSharedWorkouts(rawWorkouts);
  const runs = safeWorkouts.filter((w) => w.type === 'run');

  const totalWorkouts = safeWorkouts.length;
  const totalDistance = safeWorkouts.reduce((acc, w) => acc + (w.distance_km || 0), 0);
  const totalDuration = safeWorkouts.reduce((acc, w) => acc + (w.duration_minutes || 0), 0);
  const totalStrengthReps = safeWorkouts.reduce((acc, w) => acc + (w.total_reps || 0), 0);
  const activeDays = new Set(safeWorkouts.map((w) => w.date)).size;

  const summary: SharedProgressSummary = {
    total_workouts: totalWorkouts,
    total_distance_km: Number(totalDistance.toFixed(2)),
    total_duration_minutes: Number(totalDuration.toFixed(1)),
    total_runs: runs.length,
    total_strength_reps: totalStrengthReps,
    active_days: activeDays,
  };

  const comparisons = calculateComparisons(safeWorkouts);
  const personalBests = calculatePersonalBests(safeWorkouts);
  const weeklyTrends = calculateWeeklyTrends(safeWorkouts);
  const monthlyTrends = calculateMonthlyTrends(safeWorkouts);

  return {
    valid: true,
    summary,
    comparisons,
    personal_bests: personalBests,
    weekly_trends: weeklyTrends,
    monthly_trends: monthlyTrends,
    recent_runs: runs.slice(0, 20),
    all_workouts: safeWorkouts,
  };
}

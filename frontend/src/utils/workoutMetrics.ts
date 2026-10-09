import type { ExerciseType } from '../types/workout';

export interface RunningMetrics {
  distanceDisplay: string;
  distanceValue: number;
  durationDisplay: string;
  durationMinutes: number;
  avgPaceDisplay: string; // e.g. "5'24" /km"
  avgSpeedDisplay: string; // e.g. "11.1 km/h"
  rawPaceDecimal: number; // for PR comparisons (lower is faster)
}

export interface StrengthMetrics {
  totalReps: number;
  sets: number;
  repsPerSet: number;
  avgRepsPerSet: number;
  durationDisplay: string;
}

/**
 * Calculates pace (min/km or min/mi) and speed for a running workout.
 */
export const getRunningMetrics = (
  distanceKm: number | null | undefined,
  durationMins: number | null | undefined,
  unitDistance: 'km' | 'mi' = 'km'
): RunningMetrics => {
  const rawDistKm = distanceKm || 0;
  const rawMins = durationMins || 0;

  const distInUnit = unitDistance === 'mi' ? rawDistKm * 0.621371 : rawDistKm;
  const unitLabel = unitDistance === 'mi' ? 'mi' : 'km';
  const speedUnitLabel = unitDistance === 'mi' ? 'mph' : 'km/h';

  let paceStr = '--:--';
  let rawPaceDecimal = 0;
  let speedStr = '--';

  if (distInUnit > 0 && rawMins > 0) {
    rawPaceDecimal = rawMins / distInUnit;
    const paceMins = Math.floor(rawPaceDecimal);
    const paceSecs = Math.round((rawPaceDecimal - paceMins) * 60);

    // Format secs with leading zero if needed
    const formattedSecs = paceSecs < 10 ? `0${paceSecs}` : `${paceSecs}`;
    paceStr = `${paceMins}'${formattedSecs}" /${unitLabel}`;

    const speedKmH = rawDistKm / (rawMins / 60);
    const speedInUnit = unitDistance === 'mi' ? speedKmH * 0.621371 : speedKmH;
    speedStr = `${speedInUnit.toFixed(1)} ${speedUnitLabel}`;
  }

  const hours = Math.floor(rawMins / 60);
  const mins = Math.round(rawMins % 60);
  const durationDisplay = hours > 0 ? `${hours}h ${mins}m` : `${rawMins} min`;

  return {
    distanceDisplay: `${distInUnit.toFixed(2)} ${unitLabel}`,
    distanceValue: distInUnit,
    durationDisplay,
    durationMinutes: rawMins,
    avgPaceDisplay: paceStr,
    avgSpeedDisplay: speedStr,
    rawPaceDecimal,
  };
};

/**
 * Formats duration into human readable string
 */
export const formatDuration = (durationMinutes: number | null | undefined): string => {
  if (!durationMinutes || durationMinutes <= 0) return '--';
  const hours = Math.floor(durationMinutes / 60);
  const mins = Math.round(durationMinutes % 60);
  if (hours === 0) return `${mins} min`;
  return `${hours}h ${mins}m`;
};

/**
 * Capitalizes exercise titles properly
 */
export const formatExerciseTitle = (type: ExerciseType | string): string => {
  switch (type.toLowerCase()) {
    case 'run':
      return 'Run';
    case 'pushups':
      return 'Push-ups';
    case 'situps':
      return 'Sit-ups';
    case 'squats':
      return 'Squats';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

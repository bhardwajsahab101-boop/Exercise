import React from 'react';
import { Footprints, Flame, Shield, Dumbbell, Calendar, Clock, Edit2, Trash2, CloudOff, Gauge, Zap } from 'lucide-react';
import type { Workout } from '../types/workout';
import { getRunningMetrics } from '../utils/workoutMetrics';

interface WorkoutCardProps {
  workout: Workout;
  onEdit?: (workout: Workout) => void;
  onDelete?: (id: string) => void;
  unitDistance?: 'km' | 'mi';
}

export const WorkoutCard: React.FC<WorkoutCardProps> = ({
  workout,
  onEdit,
  onDelete,
  unitDistance = 'km',
}) => {
  const isRun = workout.type === 'run';
  const runningMetrics = isRun ? getRunningMetrics(workout.distance_km, workout.duration_minutes, unitDistance) : null;

  const getIcon = () => {
    switch (workout.type) {
      case 'run':
        return <Footprints size={20} className="icon-run" />;
      case 'pushups':
        return <Flame size={20} className="icon-pushups" />;
      case 'situps':
        return <Shield size={20} className="icon-situps" />;
      case 'squats':
        return <Dumbbell size={20} className="icon-squats" />;
      default:
        return <Footprints size={20} />;
    }
  };

  const formattedDate = new Date(workout.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="stride-card workout-item-card">
      <div className="workout-main-info">
        <div className={`workout-type-icon-box type-${workout.type}`}>
          {getIcon()}
        </div>
        <div className="workout-details">
          <div className="workout-header-line">
            <span className="workout-type-tag">
              {workout.type === 'run' ? 'Run' : workout.type === 'pushups' ? 'Push-ups' : workout.type === 'situps' ? 'Sit-ups' : 'Squats'}
            </span>
            {workout.synced === false && (
              <span className="unsynced-badge" title="Local workout - waiting for cloud sync">
                <CloudOff size={11} /> Local
              </span>
            )}
          </div>

          {isRun ? (
            <div className="run-primary-metrics-row">
              <span className="run-main-val">{runningMetrics?.distanceDisplay}</span>
              {runningMetrics?.avgPaceDisplay !== '--:--' && (
                <span className="run-metric-pill" title="Average Pace">
                  <Gauge size={12} /> {runningMetrics?.avgPaceDisplay}
                </span>
              )}
              {runningMetrics?.avgSpeedDisplay !== '--' && (
                <span className="run-metric-pill" title="Average Speed">
                  <Zap size={12} /> {runningMetrics?.avgSpeedDisplay}
                </span>
              )}
            </div>
          ) : (
            <div className="workout-primary-metric">
              {workout.total_reps} reps ({workout.sets || 1} × {workout.reps_per_set || workout.total_reps})
            </div>
          )}

          <div className="workout-meta-line">
            <span className="meta-item">
              <Calendar size={13} />
              {formattedDate}
            </span>
            {workout.duration_minutes && (
              <span className="meta-item">
                <Clock size={13} />
                {runningMetrics ? runningMetrics.durationDisplay : `${workout.duration_minutes} min`}
              </span>
            )}
          </div>
          {workout.notes && <p className="workout-notes-text">"{workout.notes}"</p>}
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="workout-card-actions">
          {onEdit && (
            <button
              onClick={() => onEdit(workout)}
              className="action-icon-btn edit"
              title="Edit Workout"
              aria-label="Edit workout"
            >
              <Edit2 size={15} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(workout.id)}
              className="action-icon-btn delete"
              title="Delete Workout"
              aria-label="Delete workout"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}

      <style>{`
        .workout-item-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.1rem 1.4rem;
          margin-bottom: 0.85rem;
        }

        .workout-main-info {
          display: flex;
          align-items: center;
          gap: 1.1rem;
        }

        .workout-type-icon-box {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .type-run { background-color: var(--color-peach-bg); color: var(--text-primary); }
        .type-pushups { background-color: var(--color-blue-bg); color: var(--text-primary); }
        .type-situps { background-color: var(--color-lavender-bg); color: var(--text-primary); }
        .type-squats { background-color: var(--color-gold-bg); color: var(--text-primary); }

        .workout-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .workout-header-line {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .workout-type-tag {
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .unsynced-badge {
          font-size: 0.68rem;
          color: #d97706;
          background: #fef3c7;
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-full);
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 700;
        }

        .run-primary-metrics-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .run-main-val {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .run-metric-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--brand-green);
          background-color: var(--brand-green-soft);
          padding: 0.25rem 0.55rem;
          border-radius: var(--radius-full);
        }

        .workout-primary-metric {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .workout-meta-line {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .workout-notes-text {
          font-size: 0.82rem;
          color: var(--text-secondary);
          font-style: italic;
          margin-top: 0.15rem;
        }

        .workout-card-actions {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .action-icon-btn {
          padding: 0.45rem;
          border-radius: var(--radius-md);
          color: var(--text-muted);
          transition: all var(--transition-fast);
        }

        .action-icon-btn.edit:hover {
          background-color: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .action-icon-btn.delete:hover {
          background-color: #fee2e2;
          color: #dc2626;
        }
      `}</style>
    </div>
  );
};

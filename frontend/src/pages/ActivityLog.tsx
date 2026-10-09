import React, { useState, useMemo } from 'react';
import { ArrowUpRight, ArrowUp, AlertTriangle, Trash2, Edit2, Gauge } from 'lucide-react';
import type { Workout, UserGoal } from '../types/workout';
import { getRunningMetrics } from '../utils/workoutMetrics';

interface ActivityLogProps {
  workouts: Workout[];
  goals: UserGoal;
  onOpenQuickLog: () => void;
  onEditWorkout: (workout: Workout) => void;
  onDeleteWorkout: (id: string) => void;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({
  workouts,
  goals,
  onOpenQuickLog,
  onEditWorkout,
  onDeleteWorkout,
}) => {
  const [exerciseFilter, setExerciseFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredWorkouts = useMemo(() => {
    let result = [...workouts];

    if (exerciseFilter !== 'all') {
      result = result.filter((w) => w.type === exerciseFilter);
    }

    const now = new Date();
    if (dateFilter === 'thisMonth') {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      result = result.filter((w) => new Date(w.date + 'T00:00:00') >= firstOfMonth);
    } else if (dateFilter === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      result = result.filter((w) => new Date(w.date + 'T00:00:00') >= sevenDaysAgo);
    } else if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      result = result.filter((w) => new Date(w.date + 'T00:00:00') >= thirtyDaysAgo);
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workouts, exerciseFilter, dateFilter]);

  const confirmDelete = (id: string) => {
    setDeletingId(id);
  };

  const handleExecuteDelete = () => {
    if (deletingId) {
      onDeleteWorkout(deletingId);
      setDeletingId(null);
    }
  };

  return (
    <div className="stride-activity-log-page animate-fade-in">
      {/* Header */}
      <div className="stride-screen-header">
        <div className="stride-kicker">YOUR TRAINING HISTORY</div>
        <div className="stride-title-row">
          <div>
            <h1 className="stride-screen-title">
              Activity log<span className="title-dot">.</span>
            </h1>
            <p className="stride-screen-subtitle">Every effort counts. Look how far you've come.</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-chips-toolbar">
        <div className="chips-group">
          <button
            className={`filter-chip ${exerciseFilter === 'all' ? 'active' : ''}`}
            onClick={() => setExerciseFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-chip ${exerciseFilter === 'run' ? 'active' : ''}`}
            onClick={() => setExerciseFilter('run')}
          >
            Run
          </button>
          <button
            className={`filter-chip ${exerciseFilter === 'pushups' ? 'active' : ''}`}
            onClick={() => setExerciseFilter('pushups')}
          >
            Push-ups
          </button>
          <button
            className={`filter-chip ${exerciseFilter === 'situps' ? 'active' : ''}`}
            onClick={() => setExerciseFilter('situps')}
          >
            Sit-ups
          </button>
          <button
            className={`filter-chip ${exerciseFilter === 'squats' ? 'active' : ''}`}
            onClick={() => setExerciseFilter('squats')}
          >
            Squats
          </button>
        </div>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="stride-select"
          aria-label="Filter date range"
        >
          <option value="all">All Dates</option>
          <option value="thisMonth">This Month</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
        </select>
      </div>

      {/* Activity Table Card */}
      <div className="stride-card table-card">
        {filteredWorkouts.length === 0 ? (
          <div className="empty-table-state">
            <p>No activity recorded yet.</p>
            <button className="btn-primary-stride margin-top" onClick={onOpenQuickLog}>
              Log an exercise
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="stride-table">
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>ACTIVITY</th>
                  <th style={{ width: '15%' }}>DATE</th>
                  <th style={{ width: '18%' }}>RESULT / DISTANCE</th>
                  <th style={{ width: '20%' }}>PACE / VOLUME</th>
                  <th style={{ width: '15%' }}>TIME</th>
                  <th style={{ width: '12%' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkouts.map((w) => {
                  const isRun = w.type === 'run';
                  const formattedDate = new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  const runningMetrics = isRun
                    ? getRunningMetrics(w.distance_km, w.duration_minutes, goals.unit_distance)
                    : null;

                  const titleText =
                    w.type === 'run'
                      ? 'Run'
                      : w.type === 'pushups'
                      ? 'Push-ups'
                      : w.type === 'situps'
                      ? 'Sit-ups'
                      : 'Squats';

                  return (
                    <tr key={w.id} className="stride-tr">
                      <td className="td-activity">
                        <div className="activity-cell">
                          <div className={`table-icon-pill type-${w.type}`}>
                            {isRun ? <ArrowUpRight size={14} /> : <ArrowUp size={14} />}
                          </div>
                          <span className="table-activity-name">{titleText}</span>
                        </div>
                      </td>
                      <td className="td-date">{formattedDate}</td>
                      <td className="td-result">
                        {isRun ? (
                          <span className="badge-distance">{runningMetrics?.distanceDisplay}</span>
                        ) : (
                          `${w.sets || 1} × ${w.reps_per_set || w.total_reps} reps`
                        )}
                      </td>
                      <td className="td-pace">
                        {isRun ? (
                          <span className="badge-pace">
                            <Gauge size={13} /> {runningMetrics?.avgPaceDisplay}
                          </span>
                        ) : (
                          <span className="badge-speed">{w.total_reps} reps total</span>
                        )}
                      </td>
                      <td className="td-time">
                        {runningMetrics ? runningMetrics.durationDisplay : w.duration_minutes ? `${w.duration_minutes} min` : '—'}
                      </td>
                      <td className="td-actions">
                        <div className="row-action-btns">
                          <button className="action-circle-btn" onClick={() => onEditWorkout(w)} title="Edit workout">
                            <Edit2 size={14} />
                          </button>
                          <button className="action-circle-btn danger" onClick={() => confirmDelete(w.id)} title="Delete workout">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="modal-overlay" onClick={() => setDeletingId(null)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-body">
              <div className="delete-icon-wrap">
                <AlertTriangle size={28} />
              </div>
              <h3>Delete Workout?</h3>
              <p>Are you sure you want to remove this log entry from your history?</p>
              <div className="modal-actions-row">
                <button className="btn-secondary-stride" onClick={() => setDeletingId(null)}>
                  Cancel
                </button>
                <button className="btn-danger-stride" onClick={handleExecuteDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .stride-activity-log-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .filter-chips-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .chips-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .filter-chip {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.45rem 1.1rem;
          border-radius: var(--radius-full);
          transition: all var(--transition-fast);
        }

        .filter-chip:hover {
          background-color: var(--bg-surface-hover);
        }

        .filter-chip.active {
          background-color: var(--brand-green);
          color: #ffffff;
          border-color: var(--brand-green);
        }

        .table-card {
          padding: 0.5rem;
        }

        .activity-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .table-icon-pill {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
        }

        .table-icon-pill.type-run { background-color: var(--color-peach-bg); }
        .table-icon-pill.type-pushups { background-color: var(--color-blue-bg); }
        .table-icon-pill.type-situps { background-color: var(--color-lavender-bg); }
        .table-icon-pill.type-squats { background-color: var(--color-gold-bg); }

        .table-activity-name {
          font-weight: 800;
        }

        .empty-table-state {
          padding: 3rem 1rem;
          text-align: center;
          color: var(--text-muted);
        }

        .delete-modal-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 0.5rem;
        }

        .delete-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: #fee2e2;
          color: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .delete-modal-body h3 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.4rem;
        }

        .delete-modal-body p {
          font-size: 0.88rem;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }

        .modal-actions-row {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          width: 100%;
        }

        .btn-danger-stride {
          background-color: #dc2626;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 0.65rem 1.4rem;
          border-radius: var(--radius-full);
          transition: background-color var(--transition-fast);
        }

        .btn-danger-stride:hover {
          background-color: #b91c1c;
        }
      `}</style>
    </div>
  );
};

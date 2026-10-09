import React from 'react';
import { ArrowUpRight, ArrowUp, CircleDot, Square, Plus, ChevronRight } from 'lucide-react';
import type { Workout, ExerciseType, UserGoal } from '../types/workout';
import { getRunningMetrics } from '../utils/workoutMetrics';

interface ExerciseFolderProps {
  workouts: Workout[];
  goals: UserGoal;
  onQuickLogExercise: (exercise: ExerciseType) => void;
  onSelectExercise: (exercise: ExerciseType) => void;
}

export const ExerciseFolder: React.FC<ExerciseFolderProps> = ({
  workouts,
  goals,
  onQuickLogExercise,
  onSelectExercise,
}) => {
  const getExerciseSummary = (type: ExerciseType) => {
    const list = workouts.filter((w) => w.type === type);
    const count = list.length;

    if (type === 'run') {
      const totalKm = list.reduce((acc, w) => acc + (w.distance_km || 0), 0);
      const totalMins = list.reduce((acc, w) => acc + (w.duration_minutes || 0), 0);
      const metrics = getRunningMetrics(totalKm, totalMins, goals.unit_distance);

      return {
        count,
        statLabel: 'Total Distance',
        statVal: metrics.distanceDisplay,
        subLabel: 'Avg Pace',
        subVal: metrics.avgPaceDisplay,
      };
    } else {
      const totalReps = list.reduce((acc, w) => acc + (w.total_reps || 0), 0);
      let bestSet = 0;
      list.forEach((w) => {
        if ((w.reps_per_set || 0) > bestSet) bestSet = w.reps_per_set || 0;
      });

      return {
        count,
        statLabel: 'Total Volume',
        statVal: `${totalReps.toLocaleString()} reps`,
        subLabel: 'Best Single Set',
        subVal: bestSet > 0 ? `${bestSet} reps/set` : '--',
      };
    }
  };

  const cardsData = [
    {
      id: 'run' as ExerciseType,
      title: 'Run',
      subtitle: 'Build your base one kilometre at a time.',
      icon: ArrowUpRight,
      bgClass: 'card-peach',
    },
    {
      id: 'pushups' as ExerciseType,
      title: 'Push-ups',
      subtitle: 'A classic strength builder, at your pace.',
      icon: ArrowUp,
      bgClass: 'card-blue',
    },
    {
      id: 'situps' as ExerciseType,
      title: 'Sit-ups',
      subtitle: 'A little core work goes a long way.',
      icon: CircleDot,
      bgClass: 'card-lavender',
    },
    {
      id: 'squats' as ExerciseType,
      title: 'Squats',
      subtitle: 'Strong legs, one set at a time.',
      icon: Square,
      bgClass: 'card-gold',
    },
  ];

  return (
    <div className="stride-exercise-folder-page animate-fade-in">
      {/* Header */}
      <div className="stride-screen-header">
        <div className="stride-kicker">YOUR MOVEMENT MENU</div>
        <div className="stride-title-row">
          <div>
            <h1 className="stride-screen-title">
              Exercise folder<span className="title-dot">.</span>
            </h1>
            <p className="stride-screen-subtitle">
              Click any exercise to view dedicated analytics, pace trends, and full log history.
            </p>
          </div>
        </div>
      </div>

      {/* 2x2 Grid of Exercise Folder Cards */}
      <div className="exercise-folder-2x2-grid">
        {cardsData.map((item) => {
          const Icon = item.icon;
          const summary = getExerciseSummary(item.id);

          return (
            <div
              key={item.id}
              className={`stride-exercise-card ${item.bgClass}`}
              onClick={() => onSelectExercise(item.id)}
            >
              <div className="ex-card-top">
                <div className="ex-circle-icon">
                  <Icon size={18} />
                </div>
                <div className="ex-count-badge">
                  <span className="count-num">{summary.count}</span>
                  <span className="count-label">LOGGED</span>
                </div>
              </div>

              <div className="ex-card-body">
                <div className="ex-title-row">
                  <h3 className="ex-title">{item.title}</h3>
                  <ChevronRight size={18} className="ex-arrow-icon" />
                </div>
                <p className="ex-subtitle">{item.subtitle}</p>

                <div className="ex-summary-pills-row">
                  <div className="ex-summary-pill">
                    <span className="pill-label">{summary.statLabel}</span>
                    <span className="pill-val">{summary.statVal}</span>
                  </div>
                  <div className="ex-summary-pill">
                    <span className="pill-label">{summary.subLabel}</span>
                    <span className="pill-val">{summary.subVal}</span>
                  </div>
                </div>
              </div>

              <div className="ex-card-footer-actions">
                <button
                  type="button"
                  className="ex-detail-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectExercise(item.id);
                  }}
                >
                  View Details & History →
                </button>
                <button
                  type="button"
                  className="ex-quick-log-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickLogExercise(item.id);
                  }}
                >
                  + Log {item.title}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Footer Note Pill */}
      <div className="folder-footer-note">
        <Plus size={14} className="text-muted" />
        <span>Select an exercise folder to inspect specific workouts or log a new session.</span>
      </div>

      <style>{`
        .stride-exercise-folder-page {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .exercise-folder-2x2-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }

        @media (max-width: 680px) {
          .exercise-folder-2x2-grid {
            grid-template-columns: 1fr;
          }
        }

        .stride-exercise-card {
          padding: 1.75rem;
          border-radius: var(--radius-xl);
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 250px;
          cursor: pointer;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }

        .stride-exercise-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .stride-exercise-card.card-peach { background-color: var(--color-peach-bg); }
        .stride-exercise-card.card-blue { background-color: var(--color-blue-bg); }
        .stride-exercise-card.card-lavender { background-color: var(--color-lavender-bg); }
        .stride-exercise-card.card-gold { background-color: var(--color-gold-bg); }

        .ex-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .ex-circle-icon {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }

        .ex-count-badge {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1;
        }

        .count-num {
          font-family: var(--font-heading);
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .count-label {
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }

        .ex-card-body {
          margin-top: 1.25rem;
          margin-bottom: 1.25rem;
        }

        .ex-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ex-title {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .ex-arrow-icon {
          color: var(--text-muted);
          transition: transform var(--transition-fast);
        }

        .stride-exercise-card:hover .ex-arrow-icon {
          transform: translateX(3px);
          color: var(--text-primary);
        }

        .ex-subtitle {
          font-size: 0.88rem;
          color: var(--text-secondary);
          margin-top: 0.2rem;
          margin-bottom: 1rem;
        }

        .ex-summary-pills-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .ex-summary-pill {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(4px);
          padding: 0.4rem 0.75rem;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          font-size: 0.75rem;
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .pill-label {
          font-size: 0.62rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .pill-val {
          font-weight: 800;
          color: var(--text-primary);
        }

        .ex-card-footer-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }

        .ex-detail-link {
          font-size: 0.82rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .ex-quick-log-btn {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--brand-green);
          background-color: var(--brand-green-soft);
          padding: 0.3rem 0.7rem;
          border-radius: var(--radius-full);
          transition: background-color var(--transition-fast);
        }

        .ex-quick-log-btn:hover {
          background-color: var(--brand-green-light);
          color: #ffffff;
        }

        .folder-footer-note {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background-color: rgba(230, 228, 220, 0.5);
          border-radius: var(--radius-full);
          font-size: 0.82rem;
          color: var(--text-secondary);
          align-self: flex-start;
        }
      `}</style>
    </div>
  );
};

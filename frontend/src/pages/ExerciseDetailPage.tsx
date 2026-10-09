import React, { useMemo } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  CircleDot, 
  Square, 
  Trash2, 
  Edit2, 
  Flame, 
  Clock, 
  TrendingUp, 
  Award,
  Footprints,
  Gauge,
  Zap
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Workout, ExerciseType, UserGoal } from '../types/workout';
import { getRunningMetrics, formatDuration, formatExerciseTitle } from '../utils/workoutMetrics';

interface ExerciseDetailPageProps {
  exerciseType: ExerciseType;
  workouts: Workout[];
  goals: UserGoal;
  onBack: () => void;
  onOpenQuickLog: (type: ExerciseType) => void;
  onEditWorkout: (workout: Workout) => void;
  onDeleteWorkout: (id: string) => void;
}

export const ExerciseDetailPage: React.FC<ExerciseDetailPageProps> = ({
  exerciseType,
  workouts,
  goals,
  onBack,
  onOpenQuickLog,
  onEditWorkout,
  onDeleteWorkout,
}) => {
  // Filter workouts for this specific exercise
  const exerciseWorkouts = useMemo(() => {
    return workouts
      .filter((w) => w.type === exerciseType)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workouts, exerciseType]);

  const isRun = exerciseType === 'run';
  const exerciseName = formatExerciseTitle(exerciseType);

  // Calculate detailed aggregate metrics
  const stats = useMemo(() => {
    const totalSessions = exerciseWorkouts.length;
    const totalDurationMins = exerciseWorkouts.reduce((acc, w) => acc + (w.duration_minutes || 0), 0);

    if (isRun) {
      const totalKm = exerciseWorkouts.reduce((acc, w) => acc + (w.distance_km || 0), 0);
      const metrics = getRunningMetrics(totalKm, totalDurationMins, goals.unit_distance);

      let bestDistKm = 0;
      let fastestPaceDecimal = Infinity;
      let fastestPaceStr = '--:--';

      exerciseWorkouts.forEach((w) => {
        if ((w.distance_km || 0) > bestDistKm) {
          bestDistKm = w.distance_km || 0;
        }
        if (w.distance_km && w.duration_minutes) {
          const runM = getRunningMetrics(w.distance_km, w.duration_minutes, goals.unit_distance);
          if (runM.rawPaceDecimal > 0 && runM.rawPaceDecimal < fastestPaceDecimal) {
            fastestPaceDecimal = runM.rawPaceDecimal;
            fastestPaceStr = runM.avgPaceDisplay;
          }
        }
      });

      const bestDistDisplay =
        goals.unit_distance === 'mi'
          ? `${(bestDistKm * 0.621371).toFixed(2)} mi`
          : `${bestDistKm.toFixed(2)} km`;

      return {
        totalSessions,
        totalDurationDisplay: formatDuration(totalDurationMins),
        totalDistanceDisplay: metrics.distanceDisplay,
        overallAvgPace: metrics.avgPaceDisplay,
        overallAvgSpeed: metrics.avgSpeedDisplay,
        bestDistanceDisplay: bestDistKm > 0 ? bestDistDisplay : '--',
        fastestPaceStr: fastestPaceDecimal !== Infinity ? fastestPaceStr : '--:--',
      };
    } else {
      const totalReps = exerciseWorkouts.reduce((acc, w) => acc + (w.total_reps || 0), 0);
      let bestSessionReps = 0;
      let bestSingleSetReps = 0;

      exerciseWorkouts.forEach((w) => {
        if ((w.total_reps || 0) > bestSessionReps) {
          bestSessionReps = w.total_reps || 0;
        }
        if ((w.reps_per_set || 0) > bestSingleSetReps) {
          bestSingleSetReps = w.reps_per_set || 0;
        }
      });

      const avgRepsPerSession = totalSessions > 0 ? Math.round(totalReps / totalSessions) : 0;

      return {
        totalSessions,
        totalDurationDisplay: formatDuration(totalDurationMins),
        totalReps: totalReps.toLocaleString(),
        bestSessionReps: bestSessionReps.toLocaleString(),
        bestSingleSetReps: bestSingleSetReps > 0 ? `${bestSingleSetReps} reps/set` : '--',
        avgRepsPerSession: avgRepsPerSession.toLocaleString(),
      };
    }
  }, [exerciseWorkouts, isRun, goals.unit_distance]);

  // Chart progression data
  const chartData = useMemo(() => {
    const sortedChronological = [...exerciseWorkouts].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedChronological.map((w) => {
      const formattedDate = new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      if (isRun) {
        const metrics = getRunningMetrics(w.distance_km, w.duration_minutes, goals.unit_distance);
        return {
          date: formattedDate,
          value: metrics.distanceValue,
          pace: metrics.avgPaceDisplay,
          minutes: w.duration_minutes || 0,
        };
      } else {
        return {
          date: formattedDate,
          value: w.total_reps || 0,
          sets: w.sets || 0,
          repsPerSet: w.reps_per_set || 0,
        };
      }
    });
  }, [exerciseWorkouts, isRun, goals.unit_distance]);

  const getExerciseIcon = () => {
    switch (exerciseType) {
      case 'run':
        return Footprints;
      case 'pushups':
        return Flame;
      case 'situps':
        return CircleDot;
      case 'squats':
        return Square;
      default:
        return Footprints;
    }
  };

  const IconComponent = getExerciseIcon();

  const getExerciseDescription = () => {
    switch (exerciseType) {
      case 'run':
        return 'Cardiovascular endurance & stamina training. Track pace, distance, and moving time.';
      case 'pushups':
        return 'Upper body compound strength exercise targeting chest, shoulders, triceps, and core.';
      case 'situps':
        return 'Abdominal strength & endurance exercise building core stability.';
      case 'squats':
        return 'Lower body strength builder targeting quads, glutes, and hamstrings.';
      default:
        return 'Personal exercise log and performance history.';
    }
  };

  return (
    <div className="stride-exercise-detail-page animate-fade-in">
      {/* Top Breadcrumb Nav & Back Button */}
      <div className="detail-top-nav">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Exercise Folder</span>
        </button>
        <span className="breadcrumb-path">MY TRAINING / EXERCISES / {exerciseName.toUpperCase()}</span>
      </div>

      {/* Screen Title Row */}
      <div className="stride-screen-header">
        <div className="stride-title-row">
          <div className="title-left">
            <div className={`detail-icon-badge type-${exerciseType}`}>
              <IconComponent size={22} />
            </div>
            <div>
              <h1 className="stride-screen-title">
                {exerciseName}<span className="title-dot">.</span>
              </h1>
              <p className="stride-screen-subtitle">{getExerciseDescription()}</p>
            </div>
          </div>

          <button className="btn-log-exercise" onClick={() => onOpenQuickLog(exerciseType)}>
            <Plus size={16} strokeWidth={2.5} />
            <span>Log {exerciseName}</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Grid tailored for this exercise */}
      {isRun ? (
        <div className="detail-metrics-grid grid-6">
          <div className="stride-card metric-box">
            <span className="metric-label">TOTAL DISTANCE</span>
            <div className="metric-value">{stats.totalDistanceDisplay}</div>
          </div>

          <div className="stride-card metric-box">
            <span className="metric-label">MOVING TIME</span>
            <div className="metric-value">{stats.totalDurationDisplay}</div>
          </div>

          <div className="stride-card metric-box">
            <span className="metric-label">AVG PACE</span>
            <div className="metric-value">{stats.overallAvgPace}</div>
          </div>

          <div className="stride-card metric-box">
            <span className="metric-label">AVG SPEED</span>
            <div className="metric-value">{stats.overallAvgSpeed}</div>
          </div>

          <div className="stride-card metric-box">
            <span className="metric-label">FASTEST PACE</span>
            <div className="metric-value text-accent">{stats.fastestPaceStr}</div>
          </div>

          <div className="stride-card metric-box">
            <span className="metric-label">TOTAL SESSIONS</span>
            <div className="metric-value">{stats.totalSessions}</div>
          </div>
        </div>
      ) : (
        <div className="detail-metrics-grid grid-6">
          <div className="stride-card metric-box">
            <span className="metric-label">TOTAL REPS</span>
            <div className="metric-value">{stats.totalReps}</div>
          </div>

          <div className="stride-card metric-box">
            <span className="metric-label">BEST SESSION</span>
            <div className="metric-value">{stats.bestSessionReps}</div>
          </div>

          <div className="stride-card metric-box">
            <span className="metric-label">BEST SET</span>
            <div className="metric-value">{stats.bestSingleSetReps}</div>
          </div>

          <div className="stride-card metric-box">
            <span className="metric-label">AVG / SESSION</span>
            <div className="metric-value">{stats.avgRepsPerSession}</div>
          </div>

          <div className="stride-card metric-box">
            <span className="metric-label">TOTAL TIME</span>
            <div className="metric-value">{stats.totalDurationDisplay}</div>
          </div>

          <div className="stride-card metric-box">
            <span className="metric-label">SESSIONS LOGGED</span>
            <div className="metric-value">{stats.totalSessions}</div>
          </div>
        </div>
      )}

      {/* Exercise Progression Chart */}
      <div className="stride-card chart-detail-card">
        <div className="card-section-header">
          <div>
            <span className="section-kicker-title">PERFORMANCE HISTORY</span>
            <h3 className="section-main-title">
              {isRun ? `Distance Progression (${goals.unit_distance.toUpperCase()})` : 'Repetition Volume Trend'}
            </h3>
          </div>
          <TrendingUp size={20} className="text-muted" />
        </div>

        {chartData.length === 0 ? (
          <div className="empty-chart-box">
            <Clock size={32} className="text-muted" />
            <p>No logged sessions for {exerciseName} yet.</p>
          </div>
        ) : (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="exerciseTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1b382b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#1b382b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#84948a', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#84948a', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                  }}
                  formatter={(val: any) => [
                    isRun ? `${val} ${goals.unit_distance}` : `${val} reps`,
                    isRun ? 'Distance' : 'Volume',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#1b382b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#exerciseTrend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* History Log Table for this exercise */}
      <div className="stride-card history-table-card">
        <div className="card-section-header">
          <div>
            <span className="section-kicker-title">FULL LOG HISTORY</span>
            <h3 className="section-main-title">{exerciseName} Sessions ({exerciseWorkouts.length})</h3>
          </div>
          <Award size={20} className="text-muted" />
        </div>

        {exerciseWorkouts.length === 0 ? (
          <div className="empty-history-box">
            <p>You haven't logged any {exerciseName} sessions yet.</p>
            <button
              className="btn-primary-stride margin-top"
              onClick={() => onOpenQuickLog(exerciseType)}
            >
              Log your first {exerciseName}
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="stride-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>DATE</th>
                  {isRun ? (
                    <>
                      <th style={{ width: '18%' }}>DISTANCE</th>
                      <th style={{ width: '16%' }}>MOVING TIME</th>
                      <th style={{ width: '18%' }}>AVG PACE</th>
                      <th style={{ width: '16%' }}>AVG SPEED</th>
                    </>
                  ) : (
                    <>
                      <th style={{ width: '20%' }}>SETS × REPS</th>
                      <th style={{ width: '20%' }}>TOTAL REPS</th>
                      <th style={{ width: '20%' }}>DURATION</th>
                    </>
                  )}
                  <th>NOTES</th>
                  <th style={{ textAlign: 'right', width: '10%' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {exerciseWorkouts.map((w) => {
                  const formattedDate = new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  const runMetrics = isRun
                    ? getRunningMetrics(w.distance_km, w.duration_minutes, goals.unit_distance)
                    : null;

                  return (
                    <tr key={w.id} className="stride-tr">
                      <td className="td-date">{formattedDate}</td>
                      {isRun ? (
                        <>
                          <td className="td-bold">
                            <span className="badge-distance">{runMetrics?.distanceDisplay}</span>
                          </td>
                          <td>{runMetrics?.durationDisplay}</td>
                          <td>
                            <span className="badge-pace">
                              <Gauge size={13} />
                              {runMetrics?.avgPaceDisplay}
                            </span>
                          </td>
                          <td>
                            <span className="badge-speed">
                              <Zap size={13} />
                              {runMetrics?.avgSpeedDisplay}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{w.sets || 1} × {w.reps_per_set || w.total_reps}</td>
                          <td className="td-bold">{w.total_reps} reps</td>
                          <td>{formatDuration(w.duration_minutes)}</td>
                        </>
                      )}
                      <td className="td-notes">{w.notes || '—'}</td>
                      <td>
                        <div className="row-action-btns">
                          <button
                            className="action-circle-btn"
                            onClick={() => onEditWorkout(w)}
                            title="Edit workout"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="action-circle-btn danger"
                            onClick={() => onDeleteWorkout(w.id)}
                            title="Delete workout"
                          >
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

      <style>{`
        .stride-exercise-detail-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .detail-top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-secondary);
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          padding: 0.45rem 0.95rem;
          border-radius: var(--radius-full);
          transition: all var(--transition-fast);
        }

        .back-btn:hover {
          background-color: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .breadcrumb-path {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }

        .title-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .detail-icon-badge {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .detail-icon-badge.type-run { background-color: var(--color-peach-bg); }
        .detail-icon-badge.type-pushups { background-color: var(--color-blue-bg); }
        .detail-icon-badge.type-situps { background-color: var(--color-lavender-bg); }
        .detail-icon-badge.type-squats { background-color: var(--color-gold-bg); }

        .detail-metrics-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.85rem;
        }

        @media (max-width: 1024px) {
          .detail-metrics-grid.grid-6 {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 600px) {
          .detail-metrics-grid.grid-6 {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .metric-box {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          padding: 1.1rem 1.2rem;
        }

        .metric-label {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }

        .metric-value {
          font-family: var(--font-heading);
          font-size: 1.45rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.1;
        }

        .text-accent {
          color: var(--brand-green);
        }

        .chart-detail-card {
          padding: 1.5rem;
        }

        .chart-wrapper {
          padding-top: 0.75rem;
        }

        .empty-chart-box, .empty-history-box {
          padding: 2.5rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-muted);
          font-size: 0.88rem;
          text-align: center;
        }

        .td-bold {
          font-weight: 700;
        }

        .td-notes {
          font-size: 0.82rem;
          color: var(--text-secondary);
          max-width: 220px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .margin-top {
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
};

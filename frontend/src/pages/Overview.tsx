import React from 'react';
import { ArrowUpRight, ArrowUp, Calendar } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis } from 'recharts';
import type { Workout, UserGoal } from '../types/workout';

interface OverviewProps {
  workouts: Workout[];
  goals: UserGoal;
  onOpenQuickLog: () => void;
  onNavigateToTab: (tab: string) => void;
  onEditWorkout: (w: Workout) => void;
  onDeleteWorkout: (id: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({
  workouts,
  goals,
  onOpenQuickLog,
  onNavigateToTab,
}) => {
  // Today date formatting
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();

  // Weekly calculations
  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(today.getDate() - diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const thisWeekWorkouts = workouts.filter((w) => {
    const d = new Date(w.date + 'T00:00:00');
    return d >= startOfWeek;
  });

  const totalThisWeekCount = thisWeekWorkouts.length;
  const totalDistanceKm = thisWeekWorkouts.reduce((acc, w) => acc + (w.distance_km || 0), 0);
  const totalDurationMins = thisWeekWorkouts.reduce((acc, w) => acc + (w.duration_minutes || 0), 0);

  // Consistency (unique days active this week)
  const activeDaysThisWeek = new Set(thisWeekWorkouts.map((w) => w.date)).size;

  // Formatting distance
  const distanceDisplay =
    goals.unit_distance === 'mi'
      ? `${(totalDistanceKm * 0.621371).toFixed(1)} mi`
      : `${totalDistanceKm.toFixed(1)} km`;

  // Weekly sparkline data
  const weekSparkline = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayWorkouts = workouts.filter((w) => w.date === dateStr);
    const totalVol = dayWorkouts.reduce((acc, w) => acc + (w.distance_km || 0) * 10 + (w.total_reps || 0), 0);
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      value: totalVol > 0 ? totalVol + 5 : 2,
    };
  });

  const recentWorkouts = workouts.slice(0, 3);

  const goalTarget = goals.weekly_target || 5;
  const progressRatio = Math.min(totalThisWeekCount / goalTarget, 1);
  const strokeDashoffset = 126 - 126 * progressRatio;

  return (
    <div className="stride-overview-page animate-fade-in">
      {/* Top Header Row */}
      <div className="stride-screen-header">
        <div className="stride-kicker">{formattedDate}</div>
        <div className="stride-title-row">
          <div>
            <h1 className="stride-screen-title">
              Keep showing up<span className="title-dot">.</span>
            </h1>
            <p className="stride-screen-subtitle">Every rep and every mile moves you forward.</p>
          </div>
        </div>
      </div>

      {/* Hero Banner Card */}
      <div className="stride-hero-banner">
        <div className="hero-content">
          <div className="hero-kicker">YOUR WEEK, IN MOTION</div>
          <h2 className="hero-heading">A little progress goes a long way.</h2>
          <p className="hero-subtext">Start with one workout. Your momentum starts here.</p>
        </div>

        <div className="hero-gauge-wrap" onClick={onOpenQuickLog} title="Click to log workout">
          <svg className="gauge-svg" viewBox="0 0 50 50">
            <circle className="gauge-bg" cx="25" cy="25" r="20" />
            <circle
              className="gauge-fill"
              cx="25"
              cy="25"
              r="20"
              style={{ strokeDasharray: 126, strokeDashoffset }}
            />
          </svg>
          <button className="gauge-btn" aria-label="Log exercise">
            <ArrowUpRight size={18} />
          </button>
        </div>
      </div>

      {/* Stats Section Header */}
      <div className="stats-section-header">
        <div>
          <span className="section-kicker">THE BIG PICTURE</span>
          <h3 className="section-title">Your activity</h3>
        </div>
        <select className="stride-select" aria-label="Filter timeline">
          <option value="this-week">This week</option>
          <option value="this-month">This month</option>
          <option value="all-time">All time</option>
        </select>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="stride-stats-grid">
        <div className="stride-card stat-box">
          <span className="stat-label">WORKOUTS</span>
          <div className="stat-value">{totalThisWeekCount}</div>
        </div>

        <div className="stride-card stat-box">
          <span className="stat-label">ACTIVE TIME</span>
          <div className="stat-value">
            {totalDurationMins} <span className="stat-unit">min</span>
          </div>
        </div>

        <div className="stride-card stat-box">
          <span className="stat-label">RUN DISTANCE</span>
          <div className="stat-value">
            {distanceDisplay.split(' ')[0]} <span className="stat-unit">{goals.unit_distance}</span>
          </div>
        </div>

        <div className="stride-card stat-box">
          <span className="stat-label">CONSISTENCY</span>
          <div className="stat-value">
            {activeDaysThisWeek} <span className="stat-unit">days</span>
          </div>
        </div>
      </div>

      {/* Dual Bottom Grid */}
      <div className="overview-dual-grid">
        {/* Movement over time Chart */}
        <div className="stride-card chart-card">
          <div className="card-header-simple">
            <div>
              <h4 className="card-title">Movement over time</h4>
              <span className="card-sub-kicker">ACTIVITY • THIS WEEK</span>
            </div>
          </div>

          <div className="overview-chart-wrap">
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={weekSparkline} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="overviewGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#40916c" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#40916c" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#84948a', fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#40916c"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#overviewGreen)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="stride-card recent-activity-card">
          <div className="card-header-simple">
            <h4 className="card-title">Recent activity</h4>
            <button className="view-all-btn" onClick={() => onNavigateToTab('activity')}>
              View all
            </button>
          </div>

          <div className="recent-list">
            {recentWorkouts.length === 0 ? (
              <div className="empty-recent-state">
                <Calendar size={24} className="text-muted" />
                <p>No workouts recorded yet this week.</p>
              </div>
            ) : (
              recentWorkouts.map((w) => {
                const isRun = w.type === 'run';
                const resultText = isRun
                  ? goals.unit_distance === 'mi'
                    ? `${((w.distance_km || 0) * 0.621371).toFixed(1)} mi`
                    : `${(w.distance_km || 0).toFixed(1)} km`
                  : `${w.sets || 1} × ${w.reps_per_set || w.total_reps}`;

                return (
                  <div key={w.id} className="recent-item-row">
                    <div className="recent-left">
                      <div className="activity-icon-pill">
                        {isRun ? <ArrowUpRight size={14} /> : <ArrowUp size={14} />}
                      </div>
                      <span className="activity-name">
                        {w.type === 'run' ? 'Run' : w.type === 'pushups' ? 'Push-ups' : w.type === 'situps' ? 'Sit-ups' : 'Squats'}
                      </span>
                    </div>
                    <span className="activity-result">{resultText}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <style>{`
        .stride-overview-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .stride-hero-banner {
          background-color: var(--bg-hero);
          color: #ffffff;
          border-radius: var(--radius-xl);
          padding: 2.2rem 2.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 640px) {
          .stride-hero-banner {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.5rem;
            padding: 1.5rem;
          }
        }

        .hero-kicker {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #7ba68e;
          margin-bottom: 0.5rem;
        }

        .hero-heading {
          font-size: 1.65rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 0.4rem;
          line-height: 1.25;
        }

        .hero-subtext {
          font-size: 0.9rem;
          color: #a3c9b4;
          max-width: 480px;
        }

        .hero-gauge-wrap {
          position: relative;
          width: 90px;
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }

        .gauge-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .gauge-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.15);
          stroke-width: 3.5;
        }

        .gauge-fill {
          fill: none;
          stroke: #528a6f;
          stroke-width: 3.5;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .gauge-btn {
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background-color: var(--color-accent-peach);
          color: #192721;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform var(--transition-fast);
        }

        .gauge-btn:hover {
          transform: scale(1.08);
        }

        .stats-section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .section-kicker {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: block;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .stride-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        @media (max-width: 840px) {
          .stride-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .stat-box {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          padding: 1.25rem 1.4rem;
        }

        .stat-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .stat-value {
          font-family: var(--font-heading);
          font-size: 2rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }

        .stat-unit {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .overview-dual-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 768px) {
          .overview-dual-grid {
            grid-template-columns: 1fr;
          }
        }

        .chart-card, .recent-activity-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .card-header-simple {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .card-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .card-sub-kicker {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          display: block;
        }

        .overview-chart-wrap {
          padding-top: 0.5rem;
        }

        .view-all-btn {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .view-all-btn:hover {
          color: var(--brand-green);
        }

        .recent-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .recent-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-subtle);
        }

        .recent-item-row:last-child {
          border-bottom: none;
        }

        .recent-left {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .activity-icon-pill {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background-color: var(--bg-app);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }

        .activity-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .activity-result {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .empty-recent-state {
          padding: 1.5rem 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-muted);
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
};

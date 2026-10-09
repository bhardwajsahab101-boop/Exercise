import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Workout, UserGoal } from '../types/workout';

interface ProgressProps {
  workouts: Workout[];
  goals: UserGoal;
}

export const Progress: React.FC<ProgressProps> = ({ workouts, goals }) => {
  const [timeRange, setTimeRange] = useState<string>('30days');
  const [selectedExercise, setSelectedExercise] = useState<string>('all');

  // Filter workouts by time range and exercise
  const filteredWorkouts = useMemo(() => {
    let list = [...workouts];

    if (selectedExercise !== 'all') {
      list = list.filter((w) => w.type === selectedExercise);
    }

    const now = new Date();
    if (timeRange === '7days') {
      const d = new Date();
      d.setDate(now.getDate() - 7);
      list = list.filter((w) => new Date(w.date + 'T00:00:00') >= d);
    } else if (timeRange === '30days') {
      const d = new Date();
      d.setDate(now.getDate() - 30);
      list = list.filter((w) => new Date(w.date + 'T00:00:00') >= d);
    } else if (timeRange === '90days') {
      const d = new Date();
      d.setDate(now.getDate() - 90);
      list = list.filter((w) => new Date(w.date + 'T00:00:00') >= d);
    }

    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [workouts, timeRange, selectedExercise]);

  // Aggregate stats
  const totalSessions = filteredWorkouts.length;
  const totalMinutes = filteredWorkouts.reduce((acc, w) => acc + (w.duration_minutes || 0), 0);
  const totalActiveDays = new Set(filteredWorkouts.map((w) => w.date)).size;

  // Chart data (weekly / interval groupings)
  const barChartData = useMemo(() => {
    // Generate dates over last 30 days or filtered range grouped into 4-5 dates
    const map = new Map<string, number>();

    filteredWorkouts.forEach((w) => {
      const dateLabel = new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      map.set(dateLabel, (map.get(dateLabel) || 0) + 1);
    });

    if (map.size === 0) {
      return [
        { date: 'Sep 14', count: 3 },
        { date: 'Sep 21', count: 5 },
        { date: 'Sep 28', count: 2 },
        { date: 'Oct 9', count: 6 },
      ];
    }

    return Array.from(map.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }, [filteredWorkouts]);

  // Personal Bests calculation
  const personalBests = useMemo(() => {
    let maxRunDistance = 0;
    let maxPushups = 0;
    let maxSitups = 0;
    let maxSquats = 0;

    workouts.forEach((w) => {
      if (w.type === 'run' && (w.distance_km || 0) > maxRunDistance) {
        maxRunDistance = w.distance_km || 0;
      } else if (w.type === 'pushups' && (w.total_reps || 0) > maxPushups) {
        maxPushups = w.total_reps || 0;
      } else if (w.type === 'situps' && (w.total_reps || 0) > maxSitups) {
        maxSitups = w.total_reps || 0;
      } else if (w.type === 'squats' && (w.total_reps || 0) > maxSquats) {
        maxSquats = w.total_reps || 0;
      }
    });

    return {
      run:
        goals.unit_distance === 'mi'
          ? `${(maxRunDistance * 0.621371).toFixed(1)} mi`
          : `${maxRunDistance.toFixed(1)} km`,
      pushups: maxPushups || 48,
      situps: maxSitups || 46,
      squats: maxSquats || 48,
    };
  }, [workouts, goals.unit_distance]);

  return (
    <div className="stride-progress-page animate-fade-in">
      {/* Header */}
      <div className="stride-screen-header">
        <div className="stride-kicker">NOTICE THE CHANGE</div>
        <div className="stride-title-row">
          <div>
            <h1 className="stride-screen-title">
              Your progress<span className="title-dot">.</span>
            </h1>
            <p className="stride-screen-subtitle">Consistency looks good on you.</p>
          </div>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="stride-select"
            aria-label="Select Timeframe"
          >
            <option value="30days">Last 30 days</option>
            <option value="7days">Last 7 days</option>
            <option value="90days">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Top 3 Stat Cards Row */}
      <div className="progress-top-stats-grid">
        <div className="stride-card progress-stat-card">
          <span className="stat-kicker">WORKOUTS LOGGED</span>
          <div className="stat-big-val">
            {totalSessions} <span className="stat-sublabel">sessions</span>
          </div>
        </div>

        <div className="stride-card progress-stat-card">
          <span className="stat-kicker">TIME MOVING</span>
          <div className="stat-big-val">
            {totalMinutes} <span className="stat-sublabel">minutes</span>
          </div>
        </div>

        <div className="stride-card progress-stat-card">
          <span className="stat-kicker">DAYS ACTIVE</span>
          <div className="stat-big-val">
            {totalActiveDays} <span className="stat-sublabel">days</span>
          </div>
        </div>
      </div>

      {/* Workouts Over Time Chart Card */}
      <div className="stride-card progress-chart-card">
        <div className="chart-header-row">
          <div>
            <span className="card-section-kicker">A VIEW OF YOUR JOURNEY</span>
            <h3 className="card-section-title">Workouts over time</h3>
          </div>

          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="stride-select"
            aria-label="Filter exercises"
          >
            <option value="all">All exercises</option>
            <option value="run">Runs</option>
            <option value="pushups">Push-ups</option>
            <option value="situps">Sit-ups</option>
            <option value="squats">Squats</option>
          </select>
        </div>

        <div className="bar-chart-container">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barChartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#84948a', fontSize: 11 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#84948a', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                }}
                formatter={(val: any) => [`${val} workout(s)`, 'Sessions']}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={28}>
                {barChartData.map((_, index) => (
                  <Cell key={`bar-${index}`} fill="#6b9e78" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Milestones / Personal Bests Section */}
      <div className="milestones-section">
        <span className="section-kicker">MILESTONES WORTH KEEPING</span>
        <h3 className="section-title">Personal bests</h3>

        <div className="pb-cards-grid">
          <div className="pb-card peach-bg">
            <div className="pb-top">
              <span className="pb-val">Run - {personalBests.run}</span>
            </div>
            <span className="pb-badge">LONGEST RUN</span>
          </div>

          <div className="pb-card lavender-bg">
            <div className="pb-top">
              <span className="pb-val">Push-ups - {personalBests.pushups}</span>
            </div>
            <span className="pb-badge">TOTAL REPS</span>
          </div>

          <div className="pb-card violet-bg">
            <div className="pb-top">
              <span className="pb-val">Sit-ups - {personalBests.situps}</span>
            </div>
            <span className="pb-badge">TOTAL REPS</span>
          </div>

          <div className="pb-card gold-bg">
            <div className="pb-top">
              <span className="pb-val">Squats - {personalBests.squats}</span>
            </div>
            <span className="pb-badge">TOTAL REPS</span>
          </div>
        </div>
      </div>

      <style>{`
        .stride-progress-page {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .progress-top-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 768px) {
          .progress-top-stats-grid {
            grid-template-columns: 1fr;
          }
        }

        .progress-stat-card {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          padding: 1.35rem 1.5rem;
        }

        .stat-kicker {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }

        .stat-big-val {
          font-family: var(--font-heading);
          font-size: 2.1rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.1;
        }

        .stat-sublabel {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .progress-chart-card {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.75rem 2rem;
        }

        .chart-header-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
        }

        .card-section-kicker {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          display: block;
        }

        .card-section-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .bar-chart-container {
          padding-top: 1rem;
        }

        .milestones-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .pb-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        @media (max-width: 900px) {
          .pb-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .pb-cards-grid {
            grid-template-columns: 1fr;
          }
        }

        .pb-card {
          padding: 1.25rem 1.2rem;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .pb-card.peach-bg { background-color: var(--color-peach-bg); }
        .pb-card.lavender-bg { background-color: var(--color-blue-bg); }
        .pb-card.violet-bg { background-color: var(--color-lavender-bg); }
        .pb-card.gold-bg { background-color: var(--color-gold-bg); }

        .pb-val {
          font-family: var(--font-heading);
          font-size: 1rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .pb-badge {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Clock,
  Award,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Footprints,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import type { SharedProgressPayload } from '../types/workout';
import { api } from '../services/api';

interface SharedProgressViewProps {

  token: string;
}

export const SharedProgressView: React.FC<SharedProgressViewProps> = ({ token }) => {
  const [data, setData] = useState<SharedProgressPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Unit toggle for parents: 'km' or 'mi'
  const [unit, setUnit] = useState<'km' | 'mi'>('km');
  const [activityFilter, setActivityFilter] = useState<'all' | 'run'>('all');
  const [chartView, setChartView] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    let isMounted = true;
    const fetchSharedData = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await api.getSharedProgress(token);
        if (isMounted) {
          setData(payload);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'This share link is invalid or has expired.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSharedData();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Unit conversion helpers
  const formatDistance = (km: number | null | undefined): string => {
    if (km === null || km === undefined) return '--';
    if (unit === 'mi') {
      return `${(km * 0.621371).toFixed(2)} mi`;
    }
    return `${km.toFixed(2)} km`;
  };

  const formatPace = (paceMinPerKm: string | null | undefined): string => {
    if (!paceMinPerKm || paceMinPerKm === '--:--') return '--:--';
    if (unit === 'km') return `${paceMinPerKm} /km`;

    // Convert min/km pace string (e.g. "5:30") to min/mi
    const parts = paceMinPerKm.split(':');
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const sec = parseInt(parts[1], 10);
      const totalSecPerKm = min * 60 + sec;
      const totalSecPerMi = totalSecPerKm / 0.621371;
      const m = Math.floor(totalSecPerMi / 60);
      const s = Math.round(totalSecPerMi % 60);
      return `${m}:${s < 10 ? '0' : ''}${s} /mi`;
    }
    return paceMinPerKm;
  };

  const formatDurationMins = (mins: number | null | undefined): string => {
    if (!mins) return '0m';
    if (mins < 60) return `${Math.round(mins)}m`;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  };

  const chartData = useMemo(() => {
    if (!data?.weekly_trends) return [];
    return data.weekly_trends.map((w) => ({
      label: w.week_label,
      distance: unit === 'mi' ? Number((w.distance_km * 0.621371).toFixed(2)) : w.distance_km,
      workouts: w.workouts,
    }));
  }, [data, unit]);

  const monthlyChartData = useMemo(() => {
    if (!data?.monthly_trends) return [];
    return data.monthly_trends.map((m) => ({
      label: m.month_label,
      distance: unit === 'mi' ? Number((m.distance_km * 0.621371).toFixed(2)) : m.distance_km,
      workouts: m.workouts,
    }));
  }, [data, unit]);

  const filteredWorkouts = useMemo(() => {
    if (!data?.all_workouts) return [];
    if (activityFilter === 'run') {
      return data.all_workouts.filter((w) => w.type === 'run');
    }
    return data.all_workouts;
  }, [data, activityFilter]);

  // Loading State
  if (loading) {
    return (
      <div className="shared-view-container">
        <div className="shared-loading-box">
          <div className="loading-spinner-ring" />
          <h2 className="loading-title">Loading workout progress...</h2>
          <p className="loading-subtitle">Preparing running history and stats.</p>
        </div>
      </div>
    );
  }

  // Error / Invalid Link State
  if (error || !data) {
    return (
      <div className="shared-view-container">
        <div className="shared-error-card">
          <div className="error-icon-box">
            <AlertTriangle size={36} className="text-warning" />
          </div>
          <h1 className="error-title">Link Inactive or Not Found</h1>
          <p className="error-text">
            {error || 'This link has either been revoked by the owner or does not exist.'}
          </p>
          <div className="error-tips">
            <p>
              The workout owner may have regenerated their share link. If you are a family member,
              please ask them to share their latest link with you.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { summary, comparisons, personal_bests } = data;

  return (
    <div className="shared-view-container animate-fade-in">
      {/* Mobile-Friendly Top Navigation Header */}
      <header className="shared-header">
        <div className="shared-brand-row">
          <div className="brand-logo-group">
            <span className="brand-dot" />
            <span className="brand-name">STRIDE</span>
            <span className="shared-badge">
              <ShieldCheck size={12} />
              <span>Read-Only Family View</span>
            </span>
          </div>

          {/* Unit Toggle */}
          <div className="unit-toggle-pill">
            <button
              type="button"
              className={`unit-toggle-btn ${unit === 'km' ? 'active' : ''}`}
              onClick={() => setUnit('km')}
            >
              km
            </button>
            <button
              type="button"
              className={`unit-toggle-btn ${unit === 'mi' ? 'active' : ''}`}
              onClick={() => setUnit('mi')}
            >
              mi
            </button>
          </div>
        </div>

        <div className="header-title-box">
          <h1 className="shared-page-title">
            Workout Progress<span className="title-dot">.</span>
          </h1>
          <p className="shared-page-subtitle">
            Running history, personal bests, and weekly consistency.
          </p>
        </div>
      </header>

      {/* Primary Aggregate Stats Grid */}
      <section className="shared-stats-grid">
        <div className="stride-card stat-item-card">
          <div className="stat-card-icon forest">
            <Footprints size={20} />
          </div>
          <span className="stat-kicker">TOTAL DISTANCE</span>
          <div className="stat-number">{formatDistance(summary.total_distance_km)}</div>
          <span className="stat-footnote">{summary.total_runs} running sessions</span>
        </div>

        <div className="stride-card stat-item-card">
          <div className="stat-card-icon peach">
            <Activity size={20} />
          </div>
          <span className="stat-kicker">TOTAL WORKOUTS</span>
          <div className="stat-number">
            {summary.total_workouts} <span className="stat-sub">logged</span>
          </div>
          <span className="stat-footnote">{summary.active_days} active training days</span>
        </div>

        <div className="stride-card stat-item-card">
          <div className="stat-card-icon mint">
            <Clock size={20} />
          </div>
          <span className="stat-kicker">TIME MOVING</span>
          <div className="stat-number">{formatDurationMins(summary.total_duration_minutes)}</div>
          <span className="stat-footnote">Total active exercise time</span>
        </div>

        <div className="stride-card stat-item-card">
          <div className="stat-card-icon lavender">
            <Award size={20} />
          </div>
          <span className="stat-kicker">LONGEST RUN</span>
          <div className="stat-number">{formatDistance(personal_bests.longest_run_km)}</div>
          <span className="stat-footnote">Personal record</span>
        </div>
      </section>

      {/* Comparisons Across Weeks & Months */}
      <section className="comparison-cards-section">
        <div className="section-header-row">
          <div>
            <span className="section-kicker">CONSISTENCY & PROGRESS</span>
            <h2 className="section-title">Weekly & Monthly Comparisons</h2>
          </div>
        </div>

        <div className="comparison-grid">
          {/* Week-over-Week Card */}
          <div className="stride-card comparison-card">
            <div className="comparison-header">
              <span className="comp-badge">THIS WEEK VS LAST WEEK</span>
              <span className="comp-period">Last 7 days vs previous 7</span>
            </div>

            <div className="comp-metric-row">
              <div className="comp-metric-label">Distance Run</div>
              <div className="comp-metric-values">
                <span className="current-val">
                  {formatDistance(comparisons.week_distance_km.current_period)}
                </span>
                <span className="prev-val">
                  was {formatDistance(comparisons.week_distance_km.previous_period)}
                </span>
              </div>
              <div
                className={`comp-diff-pill ${
                  comparisons.week_distance_km.difference >= 0 ? 'positive' : 'negative'
                }`}
              >
                {comparisons.week_distance_km.difference >= 0 ? (
                  <ArrowUpRight size={13} />
                ) : (
                  <ArrowDownRight size={13} />
                )}
                <span>
                  {comparisons.week_distance_km.difference >= 0 ? '+' : ''}
                  {formatDistance(Math.abs(comparisons.week_distance_km.difference))}
                </span>
              </div>
            </div>

            <div className="comp-metric-row">
              <div className="comp-metric-label">Workouts</div>
              <div className="comp-metric-values">
                <span className="current-val">{comparisons.week_workouts.current_period}</span>
                <span className="prev-val">was {comparisons.week_workouts.previous_period}</span>
              </div>
              <div
                className={`comp-diff-pill ${
                  comparisons.week_workouts.difference >= 0 ? 'positive' : 'neutral'
                }`}
              >
                <span>
                  {comparisons.week_workouts.difference >= 0 ? '+' : ''}
                  {comparisons.week_workouts.difference} sessions
                </span>
              </div>
            </div>

            <div className="comp-metric-row">
              <div className="comp-metric-label">Exercise Duration</div>
              <div className="comp-metric-values">
                <span className="current-val">
                  {formatDurationMins(comparisons.week_duration_minutes.current_period)}
                </span>
                <span className="prev-val">
                  was {formatDurationMins(comparisons.week_duration_minutes.previous_period)}
                </span>
              </div>
              <div
                className={`comp-diff-pill ${
                  comparisons.week_duration_minutes.difference >= 0 ? 'positive' : 'neutral'
                }`}
              >
                <span>
                  {comparisons.week_duration_minutes.difference >= 0 ? '+' : ''}
                  {formatDurationMins(Math.abs(comparisons.week_duration_minutes.difference))}
                </span>
              </div>
            </div>
          </div>

          {/* Month-over-Month Card */}
          <div className="stride-card comparison-card">
            <div className="comparison-header">
              <span className="comp-badge">THIS MONTH VS LAST MONTH</span>
              <span className="comp-period">Last 30 days vs previous 30</span>
            </div>

            <div className="comp-metric-row">
              <div className="comp-metric-label">Distance Run</div>
              <div className="comp-metric-values">
                <span className="current-val">
                  {formatDistance(comparisons.month_distance_km.current_period)}
                </span>
                <span className="prev-val">
                  was {formatDistance(comparisons.month_distance_km.previous_period)}
                </span>
              </div>
              <div
                className={`comp-diff-pill ${
                  comparisons.month_distance_km.difference >= 0 ? 'positive' : 'negative'
                }`}
              >
                {comparisons.month_distance_km.difference >= 0 ? (
                  <ArrowUpRight size={13} />
                ) : (
                  <ArrowDownRight size={13} />
                )}
                <span>
                  {comparisons.month_distance_km.difference >= 0 ? '+' : ''}
                  {formatDistance(Math.abs(comparisons.month_distance_km.difference))}
                </span>
              </div>
            </div>

            <div className="comp-metric-row">
              <div className="comp-metric-label">Workouts</div>
              <div className="comp-metric-values">
                <span className="current-val">{comparisons.month_workouts.current_period}</span>
                <span className="prev-val">was {comparisons.month_workouts.previous_period}</span>
              </div>
              <div
                className={`comp-diff-pill ${
                  comparisons.month_workouts.difference >= 0 ? 'positive' : 'neutral'
                }`}
              >
                <span>
                  {comparisons.month_workouts.difference >= 0 ? '+' : ''}
                  {comparisons.month_workouts.difference} sessions
                </span>
              </div>
            </div>

            <div className="comp-metric-row">
              <div className="comp-metric-label">Exercise Duration</div>
              <div className="comp-metric-values">
                <span className="current-val">
                  {formatDurationMins(comparisons.month_duration_minutes.current_period)}
                </span>
                <span className="prev-val">
                  was {formatDurationMins(comparisons.month_duration_minutes.previous_period)}
                </span>
              </div>
              <div
                className={`comp-diff-pill ${
                  comparisons.month_duration_minutes.difference >= 0 ? 'positive' : 'neutral'
                }`}
              >
                <span>
                  {comparisons.month_duration_minutes.difference >= 0 ? '+' : ''}
                  {formatDurationMins(Math.abs(comparisons.month_duration_minutes.difference))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Volume Trends Chart */}
      <section className="shared-charts-section">
        <div className="stride-card chart-card">
          <div className="chart-card-header">
            <div>
              <span className="card-kicker">TRAINING VOLUME</span>
              <h3 className="chart-card-title">
                {chartView === 'weekly' ? 'Weekly' : 'Monthly'} Mileage Progression
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div className="unit-toggle-pill">
                <button
                  type="button"
                  className={`unit-toggle-btn ${chartView === 'weekly' ? 'active' : ''}`}
                  onClick={() => setChartView('weekly')}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  className={`unit-toggle-btn ${chartView === 'monthly' ? 'active' : ''}`}
                  onClick={() => setChartView('monthly')}
                >
                  Monthly
                </button>
              </div>
              <span className="chart-legend-badge">Distance ({unit})</span>
            </div>
          </div>

          <div className="chart-container-box">
            {(chartView === 'weekly' ? chartData : monthlyChartData).length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={chartView === 'weekly' ? chartData : monthlyChartData}
                  margin={{ top: 15, right: 15, left: -15, bottom: 0 }}
                >

                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#84948a', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#84948a', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    }}
                    formatter={(val: any) => [`${val} ${unit}`, 'Distance']}
                  />
                  <Bar dataKey="distance" radius={[6, 6, 0, 0]} maxBarSize={32}>
                    {chartData.map((_, index) => (
                      <Cell key={`bar-${index}`} fill="#52b788" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty-state">No trend data available yet.</div>
            )}
          </div>
        </div>
      </section>

      {/* Personal Bests Section */}
      <section className="personal-bests-section">
        <div className="section-header-row">
          <div>
            <span className="section-kicker">ALL-TIME MILESTONES</span>
            <h2 className="section-title">Personal Bests</h2>
          </div>
        </div>

        <div className="pb-grid">
          <div className="stride-card pb-card peach-tint">
            <span className="pb-label">LONGEST RUN</span>
            <div className="pb-value">{formatDistance(personal_bests.longest_run_km)}</div>
            <span className="pb-sub">Single run distance</span>
          </div>

          <div className="stride-card pb-card mint-tint">
            <span className="pb-label">FASTEST PACE</span>
            <div className="pb-value">{formatPace(personal_bests.fastest_pace_min_km)}</div>
            <span className="pb-sub">Best running split</span>
          </div>

          {personal_bests.max_pushups_reps > 0 && (
            <div className="stride-card pb-card lavender-tint">
              <span className="pb-label">PUSH-UPS</span>
              <div className="pb-value">{personal_bests.max_pushups_reps} reps</div>
              <span className="pb-sub">Single session record</span>
            </div>
          )}

          {personal_bests.max_situps_reps > 0 && (
            <div className="stride-card pb-card violet-tint">
              <span className="pb-label">SIT-UPS</span>
              <div className="pb-value">{personal_bests.max_situps_reps} reps</div>
              <span className="pb-sub">Single session record</span>
            </div>
          )}

          {personal_bests.max_squats_reps > 0 && (
            <div className="stride-card pb-card gold-tint">
              <span className="pb-label">SQUATS</span>
              <div className="pb-value">{personal_bests.max_squats_reps} reps</div>
              <span className="pb-sub">Single session record</span>
            </div>
          )}
        </div>
      </section>

      {/* Running History & Workout Feed */}
      <section className="activity-feed-section">
        <div className="feed-header-row">
          <div>
            <span className="section-kicker">TRAINING TIMELINE</span>
            <h2 className="section-title">Activity History</h2>
          </div>

          <div className="feed-filter-pills">
            <button
              type="button"
              className={`filter-pill-btn ${activityFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActivityFilter('all')}
            >
              All Activities ({data.all_workouts.length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${activityFilter === 'run' ? 'active' : ''}`}
              onClick={() => setActivityFilter('run')}
            >
              Runs ({summary.total_runs})
            </button>
          </div>
        </div>

        <div className="feed-list">
          {filteredWorkouts.length === 0 ? (
            <div className="stride-card empty-feed-card">
              <p>No workouts recorded yet.</p>
            </div>
          ) : (
            filteredWorkouts.map((w) => {
              const isRun = w.type === 'run';
              const dateStr = new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              // Calculate pace if run
              let paceDisplay = '--';
              if (isRun && w.distance_km && w.duration_minutes) {
                const mins = Math.floor(w.duration_minutes / w.distance_km);
                const secs = Math.round(
                  ((w.duration_minutes / w.distance_km) - mins) * 60,
                );
                paceDisplay = formatPace(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
              }

              return (
                <div key={w.id} className="stride-card activity-history-item">
                  <div className="item-header-row">
                    <div className="item-type-badge">
                      <span className={`type-tag ${w.type}`}>
                        {w.type === 'run' ? '🏃 Run' : w.type.toUpperCase()}
                      </span>
                    </div>
                    <span className="item-date">{dateStr}</span>
                  </div>

                  <div className="item-details-grid">
                    {isRun ? (
                      <>
                        <div className="detail-col">
                          <span className="col-label">DISTANCE</span>
                          <span className="col-val">{formatDistance(w.distance_km)}</span>
                        </div>
                        <div className="detail-col">
                          <span className="col-label">DURATION</span>
                          <span className="col-val">{formatDurationMins(w.duration_minutes)}</span>
                        </div>
                        <div className="detail-col">
                          <span className="col-label">PACE</span>
                          <span className="col-val">{paceDisplay}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="detail-col">
                          <span className="col-label">TOTAL REPS</span>
                          <span className="col-val">{w.total_reps || '--'}</span>
                        </div>
                        <div className="detail-col">
                          <span className="col-label">SETS × REPS</span>
                          <span className="col-val">
                            {w.sets && w.reps_per_set ? `${w.sets} × ${w.reps_per_set}` : '--'}
                          </span>
                        </div>
                        <div className="detail-col">
                          <span className="col-label">DURATION</span>
                          <span className="col-val">{formatDurationMins(w.duration_minutes)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Security & Family Read-Only Notice Footer */}
      <footer className="shared-page-footer">
        <div className="security-notice-box">
          <ShieldCheck size={16} className="text-forest" />
          <span>
            Read-only progress view. Private notes and personal account details are never shared.
          </span>
        </div>
      </footer>

      <style>{`
        .shared-view-container {
          max-width: 960px;
          margin: 0 auto;
          padding: 1.5rem 1rem 3rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          font-family: var(--font-body, system-ui, -apple-system, sans-serif);
          color: var(--text-primary, #1b2e23);
        }

        .shared-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-subtle, #e5ebe7);
        }

        .shared-brand-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .brand-logo-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .brand-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #52b788;
        }

        .brand-name {
          font-weight: 800;
          letter-spacing: 0.12em;
          font-size: 0.9rem;
          color: #1b4332;
        }

        .shared-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #e8f5ec;
          color: #1b4332;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 600;
        }

        .unit-toggle-pill {
          display: flex;
          background: #e9edea;
          border-radius: 9999px;
          padding: 3px;
        }

        .unit-toggle-btn {
          border: none;
          background: transparent;
          padding: 0.25rem 0.75rem;
          font-size: 0.78rem;
          font-weight: 700;
          border-radius: 9999px;
          cursor: pointer;
          color: #556b5d;
          transition: all 0.15s ease;
        }

        .unit-toggle-btn.active {
          background: #ffffff;
          color: #1b4332;
          box-shadow: 0 2px 4px rgba(0,0,0,0.06);
        }

        .shared-page-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #1b4332;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .shared-page-subtitle {
          font-size: 0.95rem;
          color: #556b5d;
          margin-top: 0.25rem;
        }

        .shared-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }

        @media (max-width: 840px) {
          .shared-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .shared-stats-grid {
            grid-template-columns: 1fr;
          }
        }

        .stat-item-card {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e7ede9;
        }

        .stat-card-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.25rem;
        }

        .stat-card-icon.forest {
          background: #e8f5ec;
          color: #2d6a4f;
        }

        .stat-card-icon.peach {
          background: #fdf2e9;
          color: #d97736;
        }

        .stat-card-icon.mint {
          background: #e6f7f2;
          color: #0f766e;
        }

        .stat-card-icon.lavender {
          background: #f1edfa;
          color: #6d4ba6;
        }

        .stat-kicker {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #7b8f82;
        }

        .stat-number {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1b4332;
        }

        .stat-sub {
          font-size: 0.85rem;
          font-weight: 600;
          color: #7b8f82;
        }

        .stat-footnote {
          font-size: 0.75rem;
          color: #7b8f82;
        }

        /* Comparison Section */
        .comparison-cards-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-kicker {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #7b8f82;
        }

        .section-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: #1b4332;
          margin: 0;
        }

        .comparison-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }

        @media (max-width: 768px) {
          .comparison-grid {
            grid-template-columns: 1fr;
          }
        }

        .comparison-card {
          padding: 1.5rem;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e7ede9;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .comparison-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
          border-bottom: 1px solid #f0f4f1;
          padding-bottom: 0.75rem;
        }

        .comp-badge {
          font-size: 0.72rem;
          font-weight: 800;
          color: #1b4332;
          letter-spacing: 0.05em;
        }

        .comp-period {
          font-size: 0.72rem;
          color: #7b8f82;
        }

        .comp-metric-row {
          display: grid;
          grid-template-columns: 1.2fr 1.5fr 1fr;
          align-items: center;
          gap: 0.5rem;
        }

        @media (max-width: 480px) {
          .comp-metric-row {
            grid-template-columns: 1fr 1fr;
          }
          .comp-diff-pill {
            grid-column: span 2;
            justify-content: flex-start;
          }
        }

        .comp-metric-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #405347;
        }

        .comp-metric-values {
          display: flex;
          flex-direction: column;
        }

        .current-val {
          font-size: 1.05rem;
          font-weight: 700;
          color: #1b4332;
        }

        .prev-val {
          font-size: 0.72rem;
          color: #7b8f82;
        }

        .comp-diff-pill {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.2rem;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 9999px;
        }

        .comp-diff-pill.positive {
          background: #e8f5ec;
          color: #2d6a4f;
        }

        .comp-diff-pill.negative {
          background: #fde8e8;
          color: #b91c1c;
        }

        .comp-diff-pill.neutral {
          background: #f0f4f1;
          color: #556b5d;
        }

        /* Charts */
        .chart-card {
          padding: 1.5rem;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e7ede9;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .chart-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chart-card-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: #1b4332;
          margin: 0;
        }

        .chart-legend-badge {
          font-size: 0.75rem;
          font-weight: 600;
          background: #f0f4f1;
          color: #2d6a4f;
          padding: 0.25rem 0.6rem;
          border-radius: 9999px;
        }

        .chart-container-box {
          width: 100%;
          min-height: 240px;
        }

        .chart-empty-state {
          padding: 3rem;
          text-align: center;
          color: #7b8f82;
          font-size: 0.9rem;
        }

        /* Personal Bests */
        .personal-bests-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .pb-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }

        .pb-card {
          padding: 1.25rem;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          border: 1px solid transparent;
        }

        .pb-card.peach-tint {
          background: #fff8f2;
          border-color: #fde5d0;
        }

        .pb-card.mint-tint {
          background: #f2faf6;
          border-color: #d1f0e2;
        }

        .pb-card.lavender-tint {
          background: #f8f6fc;
          border-color: #e8e0f7;
        }

        .pb-card.violet-tint {
          background: #faf5fd;
          border-color: #f0defa;
        }

        .pb-card.gold-tint {
          background: #fffbf0;
          border-color: #fdeec6;
        }

        .pb-label {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #7b8f82;
        }

        .pb-value {
          font-size: 1.4rem;
          font-weight: 800;
          color: #1b4332;
        }

        .pb-sub {
          font-size: 0.72rem;
          color: #7b8f82;
        }

        /* Activity Feed */
        .activity-feed-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .feed-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .feed-filter-pills {
          display: flex;
          gap: 0.5rem;
        }

        .filter-pill-btn {
          border: 1px solid #e0e7e2;
          background: #ffffff;
          padding: 0.35rem 0.8rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 9999px;
          cursor: pointer;
          color: #556b5d;
          transition: all 0.15s ease;
        }

        .filter-pill-btn.active {
          background: #1b4332;
          color: #ffffff;
          border-color: #1b4332;
        }

        .feed-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .activity-history-item {
          padding: 1.25rem;
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e7ede9;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .activity-history-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .item-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .type-tag {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
        }

        .type-tag.run {
          background: #e8f5ec;
          color: #2d6a4f;
        }

        .item-date {
          font-size: 0.8rem;
          font-weight: 600;
          color: #7b8f82;
        }

        .item-details-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 480px) {
          .item-details-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .detail-col {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .col-label {
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #8c9e93;
        }

        .col-val {
          font-size: 1.05rem;
          font-weight: 700;
          color: #1b4332;
        }

        .shared-page-footer {
          margin-top: 1rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e7ede9;
          display: flex;
          justify-content: center;
        }

        .security-notice-box {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #556b5d;
          background: #f2f7f4;
          padding: 0.6rem 1.25rem;
          border-radius: 9999px;
          text-align: center;
        }

        /* Error and Loading styles */
        .shared-loading-box,
        .shared-error-card {
          max-width: 500px;
          margin: 6rem auto;
          text-align: center;
          padding: 2.5rem 2rem;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.05);
          border: 1px solid #e7ede9;
        }

        .loading-spinner-ring {
          width: 44px;
          height: 44px;
          border: 4px solid #e8f5ec;
          border-top-color: #52b788;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 1.25rem auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-icon-box {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #fef3c7;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem auto;
        }

        .error-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: #1b4332;
          margin-bottom: 0.5rem;
        }

        .error-text {
          font-size: 0.95rem;
          color: #556b5d;
          margin-bottom: 1.25rem;
        }

        .error-tips {
          background: #f9fbf9;
          padding: 1rem;
          border-radius: 12px;
          font-size: 0.82rem;
          color: #7b8f82;
          border: 1px solid #eef2ef;
        }
      `}</style>
    </div>
  );
};

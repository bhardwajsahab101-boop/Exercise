import React, { useState } from 'react';
import { Mail, RefreshCw, Download, CheckCircle, AlertCircle } from 'lucide-react';
import type { UserGoal, UserProfile, Workout } from '../types/workout';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface SettingsProps {
  goals: UserGoal;
  onUpdateGoals: (newGoals: UserGoal) => void;
  user: UserProfile;
  onSignOut: () => void;
  onManualSync: () => Promise<void>;
  workouts: Workout[];
  pendingSyncCount: number;
}

export const Settings: React.FC<SettingsProps> = ({
  goals,
  onUpdateGoals,
  user,
  onSignOut,
  onManualSync,
  workouts,
  pendingSyncCount,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<number>(goals.weekly_target || 3);
  const [unitDistance, setUnitDistance] = useState<'km' | 'mi'>(goals.unit_distance || 'km');

  const [email, setEmail] = useState('');
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [magicLinkStatus, setMagicLinkStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSaveGoal = () => {
    onUpdateGoals({
      weekly_target: selectedTarget,
      unit_distance: unitDistance,
    });
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setMagicLinkStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    if (!isSupabaseConfigured()) {
      setMagicLinkStatus({
        type: 'error',
        message: 'Supabase credentials not set in .env file.',
      });
      return;
    }

    setIsSendingMagicLink(true);
    setMagicLinkStatus(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      setMagicLinkStatus({
        type: 'success',
        message: `Magic link sent to ${email}!`,
      });
      setEmail('');
    } catch (err: any) {
      setMagicLinkStatus({
        type: 'error',
        message: err.message || 'Failed to send magic link.',
      });
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      await onManualSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const exportDataJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workouts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `stride_workouts_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="stride-settings-page animate-fade-in">
      {/* Header */}
      <div className="stride-screen-header">
        <div className="stride-kicker">YOUR ROUTINE, YOUR RULES</div>
        <div className="stride-title-row">
          <div>
            <h1 className="stride-screen-title">
              Goals & settings<span className="title-dot">.</span>
            </h1>
            <p className="stride-screen-subtitle">Set a target that feels good and fits your life.</p>
          </div>
        </div>
      </div>

      <div className="settings-stacked-layout">
        {/* Card 1: Weekly Goal */}
        <div className="stride-card settings-card">
          <div className="card-kicker-header">
            <span className="card-kicker">A GENTLE WEEKLY TARGET</span>
            <h3 className="settings-card-title">How many workouts feel right?</h3>
            <p className="settings-card-subtitle">Pick a goal that leaves room for rest, too.</p>
          </div>

          <div className="target-pill-selector">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <button
                key={num}
                type="button"
                className={`num-pill-btn ${selectedTarget === num ? 'active' : ''}`}
                onClick={() => setSelectedTarget(num)}
              >
                {num}
              </button>
            ))}
          </div>

          <div className="distance-unit-row margin-top">
            <span className="unit-label">DISTANCE UNIT:</span>
            <button
              className={`unit-chip ${unitDistance === 'km' ? 'active' : ''}`}
              onClick={() => setUnitDistance('km')}
            >
              Kilometres (km)
            </button>
            <button
              className={`unit-chip ${unitDistance === 'mi' ? 'active' : ''}`}
              onClick={() => setUnitDistance('mi')}
            >
              Miles (mi)
            </button>
          </div>

          <button className="btn-primary-stride save-goal-btn" onClick={handleSaveGoal}>
            Save weekly goal
          </button>
        </div>

        {/* Card 2: Sync across devices */}
        <div className="stride-card settings-card">
          <div className="card-kicker-header">
            <span className="card-kicker">YOUR DATA, YOUR CALL</span>
            <h3 className="settings-card-title">Sync across devices</h3>
            <p className="settings-card-subtitle">
              Connect Supabase to keep your exercise log backed up and available anywhere.
            </p>
          </div>

          {user.authenticated ? (
            <div className="auth-connected-box">
              <div className="connected-status">
                <Mail size={16} className="text-muted" />
                <span>{user.email}</span>
                <span className="connected-pill">Supabase Connected</span>
              </div>
              <div className="auth-btns-row">
                <button className="btn-secondary-stride" onClick={triggerSync} disabled={isSyncing}>
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Cloud Data'}</span>
                </button>
                <button className="btn-secondary-stride danger" onClick={onSignOut}>
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="sync-connector-box">
              <div className="local-mode-subcard">
                <span>Local mode - Saved in this browser until connected.</span>
              </div>

              {magicLinkStatus && (
                <div className={`status-banner ${magicLinkStatus.type}`}>
                  {magicLinkStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  <span>{magicLinkStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleSendMagicLink} className="magic-form">
                <div className="form-group-inline">
                  <input
                    type="email"
                    placeholder="Enter email to connect Supabase..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    required
                  />
                  <button type="submit" className="btn-secondary-stride" disabled={isSendingMagicLink}>
                    {isSendingMagicLink ? 'Sending...' : 'Connect Supabase'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Backup & Export options */}
          <div className="export-footer-row">
            <button className="btn-secondary-stride" onClick={exportDataJson}>
              <Download size={14} />
              <span>Export backup (JSON)</span>
            </button>
            <span className="local-count-text">
              {workouts.length} workout{workouts.length !== 1 ? 's' : ''} saved ({pendingSyncCount} pending)
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .stride-settings-page {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .settings-stacked-layout {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          width: 100%;
        }

        @media (max-width: 900px) {
          .settings-stacked-layout {
            grid-template-columns: 1fr;
          }
        }

        .settings-card {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .card-kicker-header {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .card-kicker {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }

        .settings-card-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .settings-card-subtitle {
          font-size: 0.88rem;
          color: var(--text-secondary);
        }

        .target-pill-selector {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .num-pill-btn {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          background-color: var(--bg-surface);
          color: var(--text-primary);
          font-family: var(--font-heading);
          font-size: 1.1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }

        .num-pill-btn:hover {
          border-color: var(--text-muted);
        }

        .num-pill-btn.active {
          background-color: var(--brand-green);
          color: #ffffff;
          border-color: var(--brand-green);
        }

        .distance-unit-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .unit-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }

        .unit-chip {
          padding: 0.4rem 0.85rem;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
          background: var(--bg-surface);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .unit-chip.active {
          background-color: var(--brand-green-soft);
          color: var(--brand-green);
          border-color: var(--brand-green-light);
        }

        .save-goal-btn {
          align-self: flex-start;
          margin-top: 0.5rem;
        }

        .sync-connector-box {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .local-mode-subcard {
          background-color: rgba(230, 228, 220, 0.4);
          padding: 0.85rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .form-group-inline {
          display: flex;
          gap: 0.6rem;
        }

        @media (max-width: 500px) {
          .form-group-inline {
            flex-direction: column;
          }
        }

        .auth-connected-box {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .connected-status {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.88rem;
          font-weight: 600;
        }

        .connected-pill {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--brand-green);
          background-color: var(--brand-green-soft);
          padding: 0.2rem 0.6rem;
          border-radius: var(--radius-full);
        }

        .auth-btns-row {
          display: flex;
          gap: 0.75rem;
        }

        .btn-secondary-stride.danger {
          color: #dc2626;
          border-color: #fee2e2;
        }

        .export-footer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 1rem;
          border-top: 1px solid var(--border-subtle);
          font-size: 0.82rem;
          color: var(--text-muted);
        }

        .status-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.85rem;
          border-radius: var(--radius-md);
          font-size: 0.82rem;
        }

        .status-banner.success { background-color: #d1fae5; color: #065f46; }
        .status-banner.error { background-color: #fee2e2; color: #991b1b; }
      `}</style>
    </div>
  );
};

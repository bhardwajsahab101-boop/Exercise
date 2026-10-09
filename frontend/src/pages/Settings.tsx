import React, { useState, useEffect } from 'react';
import {
  Mail,
  RefreshCw,
  Download,
  CheckCircle,
  AlertCircle,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  RefreshCcw,
  EyeOff,
  Link as LinkIcon,
} from 'lucide-react';
import type { UserGoal, UserProfile, Workout } from '../types/workout';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { api } from '../services/api';

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

  // Read-only Family Sharing state
  const [shareStatus, setShareStatus] = useState<{ hasActiveShare: boolean; createdAt?: string | null } | null>(null);
  const [currentShareUrl, setCurrentShareUrl] = useState<string>(
    () => localStorage.getItem('stride_owner_share_link') || '',
  );
  const [isManagingShare, setIsManagingShare] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // Load current share status on mount or auth change
  const refreshShareStatus = async () => {
    if (!user.authenticated) return;
    try {
      const res = await api.getShareStatus();
      setShareStatus(res);
      if (!res.hasActiveShare) {
        setCurrentShareUrl('');
        localStorage.removeItem('stride_owner_share_link');
      }
    } catch (e) {
      // Backend may be offline or table pending
    }
  };

  useEffect(() => {
    refreshShareStatus();
  }, [user.authenticated]);

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

  const handleGenerateShareLink = async () => {
    if (!user.authenticated) return;
    setIsManagingShare(true);
    setShareFeedback(null);
    try {
      const res = await api.generateShareLink();
      setCurrentShareUrl(res.shareUrl);
      localStorage.setItem('stride_owner_share_link', res.shareUrl);
      setShareStatus({ hasActiveShare: true, createdAt: res.createdAt });
      setShareFeedback({
        type: 'success',
        message: 'Share link generated! Copy and send it to your parents.',
      });
    } catch (err: any) {
      setShareFeedback({
        type: 'error',
        message: err.message || 'Failed to generate share link.',
      });
    } finally {
      setIsManagingShare(false);
    }
  };

  const handleRegenerateShareLink = async () => {
    if (
      !window.confirm(
        'Regenerating will revoke the current share link immediately. Anyone with the old link will lose access. Do you want to proceed?',
      )
    ) {
      return;
    }
    await handleGenerateShareLink();
  };

  const handleRevokeShareLink = async () => {
    if (
      !window.confirm(
        'Are you sure you want to revoke your share link? Anyone viewing will immediately lose access.',
      )
    ) {
      return;
    }
    setIsManagingShare(true);
    setShareFeedback(null);
    try {
      await api.revokeShareLink();
      setCurrentShareUrl('');
      localStorage.removeItem('stride_owner_share_link');
      setShareStatus({ hasActiveShare: false });
      setShareFeedback({
        type: 'success',
        message: 'Share link revoked. Family access has been disabled.',
      });
    } catch (err: any) {
      setShareFeedback({
        type: 'error',
        message: err.message || 'Failed to revoke share link.',
      });
    } finally {
      setIsManagingShare(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!currentShareUrl) return;
    try {
      await navigator.clipboard.writeText(currentShareUrl);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
    } catch (err) {
      setShareFeedback({
        type: 'info' as any,
        message: 'Please copy the link directly from the text box.',
      });
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

        {/* Card 3: Read-Only Family Sharing */}
        <div className="stride-card settings-card share-card-span">
          <div className="card-kicker-header">
            <span className="card-kicker">READ-ONLY FAMILY SHARING</span>
            <h3 className="settings-card-title">Share my progress</h3>
            <p className="settings-card-subtitle">
              Generate a private, hard-to-guess link so your parents can view your running history, progress charts, and personal bests on their phones without signing in.
            </p>
          </div>

          {!user.authenticated ? (
            <div className="share-unauth-box">
              <ShieldCheck size={20} className="text-muted" />
              <span>Connect Supabase with your owner account above to generate and manage family share links.</span>
            </div>
          ) : (
            <div className="share-controls-box">
              {/* Status Header */}
              <div className="share-status-header">
                <div className="status-label-group">
                  <span className={`status-dot-indicator ${shareStatus?.hasActiveShare ? 'active' : 'inactive'}`} />
                  <span className="status-main-text">
                    {shareStatus?.hasActiveShare ? 'Share Link Active' : 'Sharing Inactive'}
                  </span>
                </div>
                {shareStatus?.hasActiveShare && shareStatus.createdAt && (
                  <span className="status-date-sub">
                    Active since {new Date(shareStatus.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {shareFeedback && (
                <div className={`status-banner ${shareFeedback.type}`}>
                  {shareFeedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  <span>{shareFeedback.message}</span>
                </div>
              )}

              {shareStatus?.hasActiveShare ? (
                <div className="active-share-flow">
                  {currentShareUrl ? (
                    <div className="share-input-group">
                      <div className="share-input-wrapper">
                        <LinkIcon size={16} className="share-input-icon" />
                        <input
                          type="text"
                          readOnly
                          value={currentShareUrl}
                          className="form-input share-url-input"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-primary-stride copy-share-btn"
                        onClick={handleCopyShareLink}
                      >
                        {hasCopied ? (
                          <>
                            <Check size={14} />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy link</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="link-active-notice">
                      <p>
                        A share link is active in the database. If you need the URL again, click <strong>Regenerate link</strong> below to produce a fresh copy.
                      </p>
                    </div>
                  )}

                  <div className="share-actions-row">
                    <button
                      type="button"
                      className="btn-secondary-stride"
                      onClick={handleRegenerateShareLink}
                      disabled={isManagingShare}
                    >
                      <RefreshCcw size={14} className={isManagingShare ? 'animate-spin' : ''} />
                      <span>Regenerate link</span>
                    </button>

                    <button
                      type="button"
                      className="btn-secondary-stride danger"
                      onClick={handleRevokeShareLink}
                      disabled={isManagingShare}
                    >
                      <EyeOff size={14} />
                      <span>Revoke link</span>
                    </button>
                  </div>

                  <div className="share-security-callout">
                    <p className="callout-primary">
                      <strong>The link will work for anyone who has it, so send it only to the people you want to view your progress.</strong>
                    </p>
                    <p className="callout-secondary">
                      Parents can see your running history, progress charts, and personal records. Your private notes, account credentials, and workout editing tools are strictly protected and never shared.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="inactive-share-flow">
                  <p className="inactive-help-text">
                    No active share link. Generate a secure, 64-character random link that you can copy and text or email to your family.
                  </p>
                  <button
                    type="button"
                    className="btn-primary-stride generate-share-btn"
                    onClick={handleGenerateShareLink}
                    disabled={isManagingShare}
                  >
                    <Share2 size={16} />
                    <span>{isManagingShare ? 'Generating...' : 'Generate share link'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
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

        .share-card-span {
          grid-column: 1 / -1;
        }

        .share-unauth-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.25rem;
          background: #f9fbf9;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.9rem;
          border: 1px dashed var(--border-subtle);
        }

        .share-controls-box {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .share-status-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-subtle);
        }

        .status-label-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-dot-indicator {
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }

        .status-dot-indicator.active {
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }

        .status-dot-indicator.inactive {
          background: #9ca3af;
        }

        .status-main-text {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .status-date-sub {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .active-share-flow {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .share-input-group {
          display: flex;
          gap: 0.75rem;
          width: 100%;
        }

        @media (max-width: 600px) {
          .share-input-group {
            flex-direction: column;
          }
        }

        .share-input-wrapper {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
        }

        .share-input-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .share-url-input {
          padding-left: 2.3rem !important;
          font-family: monospace;
          font-size: 0.85rem !important;
          background-color: #f8faf8 !important;
          cursor: text;
        }

        .copy-share-btn {
          white-space: nowrap;
          padding: 0 1.25rem;
        }

        .share-actions-row {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .share-security-callout {
          background: #f4f8f5;
          border-radius: var(--radius-md);
          padding: 1rem 1.25rem;
          border-left: 4px solid #52b788;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .callout-primary {
          font-size: 0.88rem;
          color: #1b4332;
          margin: 0;
        }

        .callout-secondary {
          font-size: 0.82rem;
          color: #556b5d;
          margin: 0;
        }

        .inactive-share-flow {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .inactive-help-text {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .generate-share-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .link-active-notice {
          font-size: 0.88rem;
          color: var(--text-secondary);
          padding: 0.75rem 1rem;
          background: #f9fbf9;
          border-radius: var(--radius-sm);
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

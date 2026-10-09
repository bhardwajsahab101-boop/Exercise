import React from 'react';
import { 
  Plus, 
  LayoutDashboard, 
  History, 
  TrendingUp, 
  FolderKanban, 
  Settings as SettingsIcon,
  WifiOff,
  UserCheck
} from 'lucide-react';
import type { UserProfile } from '../types/workout';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenQuickLog: () => void;
  isOnline: boolean;
  user: UserProfile;
  pendingSyncCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenQuickLog,
  isOnline,
  user,
  pendingSyncCount,
}) => {
  const tabs = [
    { id: 'overview', label: 'OVERVIEW', pathLabel: 'MY TRAINING / OVERVIEW', icon: LayoutDashboard },
    { id: 'activity', label: 'ACTIVITY LOG', pathLabel: 'MY TRAINING / ACTIVITY', icon: History },
    { id: 'progress', label: 'PROGRESS', pathLabel: 'MY TRAINING / PROGRESS', icon: TrendingUp },
    { id: 'exercises', label: 'EXERCISES', pathLabel: 'MY TRAINING / EXERCISES', icon: FolderKanban },
    { id: 'settings', label: 'SETTINGS', pathLabel: 'MY TRAINING / SETTINGS', icon: SettingsIcon },
  ];

  return (
    <>
      <header className="stride-header">
        {/* Logo */}
        <div className="brand-logo-area" onClick={() => setActiveTab('overview')}>
          <span className="arrow-icon">↗</span>
          <span>stride</span>
          <span className="brand-dot">.</span>
        </div>

        {/* Center Desktop Navigation Bar */}
        <nav className="nav-tabs-desktop">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right side status & action button */}
        <div className="header-actions">
          {pendingSyncCount > 0 && (
            <span className="sync-badge" title="Workouts pending cloud sync">
              {pendingSyncCount} pending
            </span>
          )}

          {!isOnline && (
            <span className="offline-badge" title="Offline mode">
              <WifiOff size={13} />
            </span>
          )}

          {user.authenticated && (
            <span className="auth-badge" onClick={() => setActiveTab('settings')} title={`Signed in as ${user.email}`}>
              <UserCheck size={14} />
            </span>
          )}

          <button className="btn-log-exercise" onClick={onOpenQuickLog}>
            <Plus size={16} strokeWidth={2.5} />
            <span>Log exercise</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-nav-bar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <style>{`
        .sync-badge {
          font-size: 0.7rem;
          font-weight: 700;
          color: #d97706;
          background: #fef3c7;
          padding: 0.25rem 0.65rem;
          border-radius: var(--radius-full);
        }
        .offline-badge {
          display: flex;
          align-items: center;
          color: #dc2626;
          background: #fee2e2;
          padding: 0.3rem;
          border-radius: var(--radius-full);
        }
        .auth-badge {
          display: flex;
          align-items: center;
          color: var(--brand-green);
          background: var(--brand-green-soft);
          padding: 0.35rem 0.55rem;
          border-radius: var(--radius-full);
          cursor: pointer;
        }
      `}</style>
    </>
  );
};

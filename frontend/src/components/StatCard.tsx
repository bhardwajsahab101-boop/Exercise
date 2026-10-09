import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  bgColor?: string;
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'var(--brand-accent)',
  bgColor = 'var(--brand-soft)',
  trend,
}) => {
  return (
    <div className="card-base stat-card-wrap">
      <div className="stat-card-header">
        <div className="stat-icon-wrap" style={{ backgroundColor: bgColor, color: iconColor }}>
          <Icon size={22} />
        </div>
        {trend && <span className="stat-trend-badge">{trend}</span>}
      </div>
      <div className="stat-card-body">
        <h4 className="stat-title">{title}</h4>
        <div className="stat-value">{value}</div>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>

      <style>{`
        .stat-card-wrap {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 1rem;
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stat-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-trend-badge {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--brand-accent);
          background: var(--brand-soft);
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-full);
        }

        .stat-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.2rem;
        }

        .stat-value {
          font-family: var(--font-heading);
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.1;
        }

        .stat-subtitle {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin-top: 0.35rem;
        }
      `}</style>
    </div>
  );
};

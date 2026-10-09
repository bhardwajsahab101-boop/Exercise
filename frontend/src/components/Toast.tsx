import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}

      <style>{`
        .toast-container {
          position: fixed;
          top: 1.5rem;
          right: 1.5rem;
          z-index: 2000;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          max-width: 380px;
          width: 100%;
          pointer-events: none;
        }

        .toast-item {
          pointer-events: auto;
          background: #ffffff;
          border-radius: var(--radius-md);
          padding: 0.85rem 1.1rem;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          font-size: 0.88rem;
          font-weight: 500;
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .toast-item.success { border-left: 4px solid var(--brand-accent); }
        .toast-item.error { border-left: 4px solid #dc2626; }
        .toast-item.info { border-left: 4px solid #2563eb; }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .toast-dismiss {
          color: var(--text-muted);
          padding: 0.2rem;
          border-radius: var(--radius-full);
        }
        .toast-dismiss:hover { background-color: var(--bg-surface-hover); }
      `}</style>
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={18} className="text-brand-accent" />;
      case 'error':
        return <AlertCircle size={18} style={{ color: '#dc2626' }} />;
      default:
        return <Info size={18} style={{ color: '#2563eb' }} />;
    }
  };

  return (
    <div className={`toast-item ${toast.type}`}>
      <div className="toast-content">
        {getIcon()}
        <span>{toast.text}</span>
      </div>
      <button onClick={() => onDismiss(toast.id)} className="toast-dismiss" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
};

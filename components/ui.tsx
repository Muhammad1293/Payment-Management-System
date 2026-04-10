'use client';
// components/ui.tsx
// Shared reusable UI primitives used across all pages

import { ReactNode, MouseEvent } from 'react';

// ── Spinner ────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// ── EmptyState ─────────────────────────────────────────────────
export function EmptyState({
  icon, title, subtitle, action,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', gap: 12, textAlign: 'center',
    }}>
      {icon && (
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', marginBottom: 4,
        }}>
          {icon}
        </div>
      )}
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320 }}>{subtitle}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

// ── PageHeader ─────────────────────────────────────────────────
export function PageHeader({
  title, subtitle, action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────
export function Modal({
  title, children, footer, onClose, maxWidth = 520,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  maxWidth?: number;
}) {
  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── FormError ──────────────────────────────────────────────────
export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div style={{
      background: 'var(--red-dim)', border: '1px solid var(--red)',
      borderRadius: 8, padding: '10px 14px',
      fontSize: 13, color: 'var(--red)',
    }}>
      {message}
    </div>
  );
}

// ── InfoBox ────────────────────────────────────────────────────
export function InfoBox({ children, type = 'info' }: { children: ReactNode; type?: 'info' | 'warning' | 'success' }) {
  const colors = {
    info:    { bg: 'var(--blue-dim)',   border: 'var(--blue)',   text: 'var(--blue)'  },
    warning: { bg: 'var(--accent-dim)', border: 'var(--accent)', text: 'var(--accent)' },
    success: { bg: 'var(--green-dim)',  border: 'var(--green)',  text: 'var(--green)' },
  };
  const c = colors[type];
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 8, padding: '10px 14px',
      fontSize: 13, color: c.text,
    }}>
      {children}
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────
export function StatCard({
  label, value, sub, color = 'var(--text-primary)',
}: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div
        className="stat-value"
        style={{ color, fontSize: typeof value === 'string' && value.length > 8 ? 20 : 28 }}
      >
        {value}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ── LoadingRows ────────────────────────────────────────────────
export function LoadingRows({ cols = 5, rows = 6 }: { cols?: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j}>
              <div style={{
                height: 14, borderRadius: 4,
                background: 'var(--bg-elevated)',
                width: j === 0 ? '70%' : j === cols - 1 ? '40%' : '55%',
                animation: 'pulse 1.5s ease infinite',
              }} />
            </td>
          ))}
        </tr>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}

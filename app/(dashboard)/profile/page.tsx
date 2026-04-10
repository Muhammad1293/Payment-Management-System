'use client';
// app/(dashboard)/profile/page.tsx
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function ProfilePage() {
  const { user }              = useAuth();
  const { toast }             = useToast();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const changePassword = async () => {
    setError('');
    if (!currentPw || !newPw || !confirmPw) { setError('All fields are required'); return; }
    if (newPw !== confirmPw) { setError('New passwords do not match'); return; }
    if (newPw.length < 8)   { setError('New password must be at least 8 characters'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        toast('Password changed successfully');
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
      } else {
        setError(data.error || 'Failed to change password');
      }
    } finally {
      setSaving(false);
    }
  };

  const ROLE_LABELS: Record<string, string> = {
    admin: 'System Admin', accountant: 'Accountant', supervisor: 'Supervisor',
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-sub">Account information and settings</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--accent-dim)', border: '2px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: 'var(--accent)',
          }}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.email}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Full Name', value: user?.name },
            { label: 'Email Address', value: user?.email },
            { label: 'Role', value: ROLE_LABELS[user?.role || ''] || user?.role },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11 }}>
                {row.label}
              </span>
              <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div className="card">
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Change Password</h2>

        {error && (
          <div style={{
            background: 'var(--red-dim)', border: '1px solid var(--red)',
            borderRadius: 8, padding: '10px 14px', fontSize: 13,
            color: 'var(--red)', marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="label">Current Password</label>
            <input
              type="password" className="input"
              value={currentPw} onChange={e => setCurrentPw(e.target.value)}
              placeholder="Enter your current password"
            />
          </div>
          <div className="form-group">
            <label className="label">New Password</label>
            <input
              type="password" className="input"
              value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="Minimum 8 characters"
            />
          </div>
          <div className="form-group">
            <label className="label">Confirm New Password</label>
            <input
              type="password" className="input"
              value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              placeholder="Re-enter new password"
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={changePassword}
            disabled={saving}
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
          >
            {saving ? 'Saving…' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

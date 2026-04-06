'use client';
// app/(dashboard)/users/page.tsx
import { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface User {
  id: string; name: string; email: string;
  role: string; is_active: number; created_at: string;
}

export default function UsersPage() {
  const { user: me }          = useAuth();
  const router                = useRouter();
  const { toast }             = useToast();
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (me && me.role !== 'admin') { router.push('/dashboard'); return; }
    load();
  }, [me]);

  const load = () => {
    setLoading(true);
    fetch('/api/users').then(r => r.json()).then(({ data }) => setUsers(data || [])).finally(() => setLoading(false));
  };

  const toggleActive = async (u: User) => {
    const res = await fetch(`/api/users/${u.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: u.is_active ? 0 : 1 }),
    });
    if (res.ok) { toast(`${u.name} ${u.is_active ? 'deactivated' : 'activated'}`); load(); }
  };

  const ROLE_COLORS: Record<string, string> = {
    admin: 'badge-gold', accountant: 'badge-blue', supervisor: 'badge-green',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-sub">{users.length} system users</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add User
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 60 }}>Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name} {u.id === me?.sub && <span className="badge badge-gold" style={{ fontSize: 10, marginLeft: 6 }}>you</span>}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{u.email}</td>
                  <td><span className={`badge ${ROLE_COLORS[u.role] || 'badge-blue'}`}>{u.role}</span></td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    {new Date(u.created_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    {u.id !== me?.sub && (
                      <button
                        className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-ghost'}`}
                        onClick={() => toggleActive(u)}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); toast('User created and credentials sent via email'); }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'supervisor' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name || !form.email || !form.password) { setError('All fields are required'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) onSaved();
      else { const d = await res.json(); setError(d.error || 'Failed'); }
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Create User</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>{error}</div>}
          <div className="form-group">
            <label className="label">Full Name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
          </div>
          <div className="form-group">
            <label className="label">Email *</label>
            <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@afgarden.com" />
          </div>
          <div className="form-group">
            <label className="label">Password *</label>
            <input type="password" className="input" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 characters" />
          </div>
          <div className="form-group">
            <label className="label">Role *</label>
            <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="supervisor">Supervisor</option>
              <option value="accountant">Accountant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ background: 'var(--blue-dim)', border: '1px solid var(--blue)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--blue)' }}>
            ℹ The user will receive their login credentials via email.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button>
        </div>
      </div>
    </div>
  );
}

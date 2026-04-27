'use client';
// app/(dashboard)/residents/page.tsx
import { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import Select from 'react-select';

interface Resident {
  id: string; name: string; email: string; phone: string;
  resident_type: 'owner'|'tenant'; floor_number: number;
  monthly_charge: number; status: 'active'|'inactive';
  house_id: string; house_number: string;
}

interface House {
  id: string;
  house_number: string;
  owner_name?: string;
  num_floors: number;
}
export default function ResidentsPage() {
  const { toast }                   = useToast();
  const [residents, setResidents]   = useState<Resident[]>([]);
  const [houses, setHouses]         = useState<House[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editRes, setEditRes]       = useState<Resident | null>(null);
  const [filterHouse, setFilterHouse] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [search, setSearch]         = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterHouse)  params.set('house_id', filterHouse);
    if (filterStatus) params.set('status', filterStatus);
    Promise.all([
      fetch(`/api/residents?${params}`).then(r => r.json()),
      fetch('/api/houses').then(r => r.json()),
    ]).then(([r, h]) => {
      setResidents(r.data || []);
      setHouses(h.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterHouse, filterStatus]);

  const filtered = residents.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.house_number?.includes(search)
  );

  const deleteResident = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}? This will also remove their dues.`)) return;
    const res = await fetch(`/api/residents/${id}`, { method: 'DELETE' });
    if (res.ok) { toast(`${name} removed`); load(); }
    else toast('Failed to remove resident', 'error');
  };

  const toggleStatus = async (r: Resident) => {
    const newStatus = r.status === 'active' ? 'inactive' : 'active';
    const res = await fetch(`/api/residents/${r.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { toast(`${r.name} marked ${newStatus}`); load(); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Residents</h1>
          <p className="page-sub">{filtered.length} residents found</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditRes(null); setShowModal(true); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Resident
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input className="input" placeholder="Search name or house…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
        <select className="input" value={filterHouse} onChange={e => setFilterHouse(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Houses</option>
          {houses.map(h => <option key={h.id} value={h.id}>House {h.house_number}</option>)}
        </select>
        <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 140 }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 60 }}>Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Resident</th><th>House</th><th>Floor</th><th>Type</th>
                <th>Monthly</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    {r.email && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.email}</div>}
                  </td>
                  <td><span className="badge badge-blue">{r.house_number}</span></td>
                 <td style={{ color: 'var(--text-secondary)' }}>
                                Floor {r.floor_number === 0 ? 'G' : r.floor_number}
                                     </td>
                  <td>
                    <span className={`badge ${r.resident_type === 'owner' ? 'badge-gold' : 'badge-blue'}`}>
                      {r.resident_type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    PKR {r.monthly_charge.toLocaleString()}
                  </td>
                  <td>
                    <button
                      onClick={() => toggleStatus(r)}
                      className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-red'}`}
                      style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
                    >
                      {r.status}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditRes(r); setShowModal(true); }}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteResident(r.id, r.name)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No residents found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ResidentModal
          resident={editRes}
          houses={houses}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); toast(editRes ? 'Resident updated' : 'Resident added'); }}
        />
      )}
    </div>
  );
}

function ResidentModal({ resident, houses, onClose, onSaved }: {
  resident: Resident | null; houses: House[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    house_id:       resident?.house_id       || '',
    name:           resident?.name           || '',
    email:          resident?.email          || '',
    phone:          resident?.phone          || '',
    resident_type:  resident?.resident_type  || 'tenant',
    floor_number: resident?.floor_number ?? 0,
    monthly_charge: resident?.monthly_charge ?? '',
    status:         resident?.status         || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const selectedHouse = houses.find(h => h.id === form.house_id);

  const save = async () => {
    if (
 !form.house_id ||
 !form.name ||
 !form.resident_type ||
 form.monthly_charge === ''
) { setError('House, name and type are required'); return; }
    setSaving(true); setError('');
    try {
      const url = resident ? `/api/residents/${resident.id}` : '/api/residents';
      const method = resident ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) onSaved();
      else { const d = await res.json(); setError(d.error || 'Save failed'); }
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{resident ? 'Edit Resident' : 'Add Resident'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">House *</label>
              <Select
  options={houses.map(h => ({
    value: h.id,
    label: `House ${h.house_number}${h.owner_name ? ` - ${h.owner_name}` : ''}`,
  }))}

  value={
    houses.find(h => h.id === form.house_id)
      ? {
          value: form.house_id,
          label: `House ${
            houses.find(h => h.id === form.house_id)?.house_number
          }${
            houses.find(h => h.id === form.house_id)?.owner_name
              ? ` - ${houses.find(h => h.id === form.house_id)?.owner_name}`
              : ''
          }`,
        }
      : null
  }

  onChange={(selected) => set('house_id', selected?.value || '')}

  placeholder="Search house number or owner..."

  isSearchable

  styles={{
    control: (base, state) => ({
      ...base,
      backgroundColor: 'var(--bg-elevated)',
      borderColor: state.isFocused ? 'var(--accent)' : 'var(--border)',
      color: 'var(--text-primary)',
      boxShadow: 'none',
      minHeight: 42,
    }),

    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      zIndex: 9999,
    }),

    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused
        ? 'rgba(99, 102, 241, 0.15)'
        : 'transparent',
      color: 'var(--text-primary)',
      cursor: 'pointer',
    }),

    singleValue: (base) => ({
      ...base,
      color: 'var(--text-primary)',
    }),

    input: (base) => ({
      ...base,
      color: 'var(--text-primary)',
    }),

    placeholder: (base) => ({
      ...base,
      color: 'var(--text-muted)',
    }),
  }}
/>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Full Name *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Resident full name" />
            </div>
            <div className="form-group">
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="For receipt emails" />
            </div>
            <div className="form-group">
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label className="label">Type *</label>
              <select className="input" value={form.resident_type} onChange={e => set('resident_type', e.target.value)}>
                <option value="tenant">Tenant</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Floor</label>
              <select
                   className="input"
                  value={form.floor_number}
                 onChange={e => set('floor_number', parseInt(e.target.value))}
                      >
                 <option value={0}>Floor G</option>

                {Array.from({ length: selectedHouse?.num_floors || 4 }, (_, i) => (
               <option key={i + 1} value={i + 1}>
                Floor {i + 1}
                </option>
                ))}
            </select>
            </div>
            <div className="form-group">
              <label className="label">Monthly Charge (PKR) *</label>
              <input
              type="number"
             className="input"
              value={form.monthly_charge}
              onChange={e =>
              set(
               'monthly_charge',
                e.target.value === '' ? '' : parseFloat(e.target.value)
                )
               }
               placeholder="Enter monthly charge"
                  />
            </div>
            {resident && (
              <div className="form-group">
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

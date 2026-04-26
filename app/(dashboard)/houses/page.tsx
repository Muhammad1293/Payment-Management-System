'use client';
// app/(dashboard)/houses/page.tsx
import { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';

interface House {
  id: string;
  house_number: string;
  owner_name?: string;

  dev_charge_status: 'paid' | 'unpaid';
  elec_charge_status: 'paid' | 'unpaid';
  gas_charge_status: 'paid' | 'unpaid';

  dev_charge_amount: number;
  elec_charge_amount: number;
  gas_charge_amount: number;

  total_residents: number;
  active_residents: number;
}

export default function HousesPage() {
  const { toast }             = useToast();
  const [houses, setHouses]   = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editHouse, setEditHouse] = useState<House | null>(null);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/houses').then(r => r.json()).then(({ data }) => setHouses(data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = houses.filter(h =>
  !search ||
  h.house_number.toLowerCase().includes(search.toLowerCase()) ||
  h.owner_name?.toLowerCase().includes(search.toLowerCase())
);

  const deleteHouse = async (id: string, num: string) => {
    if (!confirm(`Delete house ${num}? This will remove all residents and data.`)) return;
    const res = await fetch(`/api/houses/${id}`, { method: 'DELETE' });
    if (res.ok) { toast(`House ${num} deleted`); load(); }
    else toast('Failed to delete house', 'error');
  };

  const ChargeStatus = ({ status, label }: { status: 'paid'|'unpaid'; label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
      <span className={`badge ${status === 'paid' ? 'badge-green' : 'badge-red'}`} style={{ padding: '2px 7px', fontSize: 11 }}>
        {status === 'paid' ? '✓' : '✕'}
      </span>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Houses</h1>
        <p className="page-sub">{filtered.length} Houses found</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditHouse(null); setShowModal(true); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add House
        </button>
      </div>

{/* Search */}
<div style={{ marginBottom: 18 }}>
  <input
    className="input"
    placeholder="Search house no or owner..."
    value={search}
    onChange={e => setSearch(e.target.value)}
    style={{ maxWidth: 280 }}
  />
</div>

{loading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 60 }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(h => (
            <div key={h.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: 'var(--accent)',
                  }}>
                    {h.house_number}
                  </div>
                 <div>
  <div style={{ fontWeight: 700, fontSize: 16 }}>
    House {h.house_number}
  </div>

  <div
    style={{
      fontSize: 14,
      fontWeight: 600,
      color: h.owner_name ? 'var(--text-primary)' : 'var(--text-muted)',
      marginTop: 3,
      lineHeight: 1.25
    }}
  >
    {h.owner_name || 'No owner assigned'}
  </div>
</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditHouse(h); setShowModal(true); }}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteHouse(h.id, h.house_number)}>Del</button>
                </div>
              </div>

              {/* Residents */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div className="card-sm" style={{ flex: 1, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{h.active_residents || 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Active</div>
                </div>
                <div className="card-sm" style={{ flex: 1, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-secondary)' }}>{h.total_residents || 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total</div>
                </div>
              </div>

              {/* Charges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 2 }}>
                  One-time Charges
                </div>
                <ChargeStatus status={h.dev_charge_status} label={`Development${h.dev_charge_amount ? ` – PKR ${h.dev_charge_amount.toLocaleString()}` : ''}`} />
                <ChargeStatus status={h.elec_charge_status} label={`Electricity${h.elec_charge_amount ? ` – PKR ${h.elec_charge_amount.toLocaleString()}` : ''}`} />
                <ChargeStatus status={h.gas_charge_status} label={`Gas${h.gas_charge_amount ? ` – PKR ${h.gas_charge_amount.toLocaleString()}` : ''}`} />
              </div>
            </div>
          ))}
         {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              No houses yet. Click "Add House" to get started.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <HouseModal
          house={editHouse}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); toast(editHouse ? 'House updated' : 'House added'); }}
        />
      )}
    </div>
  );
}

function HouseModal({ house, onClose, onSaved }: {
  house: House | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    house_number: house?.house_number || '',
    owner_name:   house?.owner_name   || '',
    dev_charge_status:  house?.dev_charge_status  || 'unpaid',
    elec_charge_status: house?.elec_charge_status || 'unpaid',
    gas_charge_status:  house?.gas_charge_status  || 'unpaid',
    dev_charge_amount:  house?.dev_charge_amount  || 0,
    elec_charge_amount: house?.elec_charge_amount || 0,
    gas_charge_amount:  house?.gas_charge_amount  || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.house_number) { setError('House number is required'); return; }
    setSaving(true); setError('');
    try {
      const url = house ? `/api/houses/${house.id}` : '/api/houses';
      const method = house ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) onSaved();
      else { const d = await res.json(); setError(d.error || 'Save failed'); }
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{house ? 'Edit House' : 'Add House'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1' }}>
              <label className="label">House Number *</label>
             <input className="input" value={form.house_number} onChange={e => set('house_number', e.target.value.toUpperCase())} placeholder="e.g. A-01" />
            </div>
           <div className="form-group">
  <label className="label">Owner Name</label>
  <input className="input" value={form.owner_name} onChange={e => set('owner_name', e.target.value)} placeholder="e.g. Muhammad Ahmed" />
</div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
              One-time Charges
            </div>
            {(['dev', 'elec', 'gas'] as const).map(type => {
              const labels = { dev: 'Development', elec: 'Electricity', gas: 'Gas' };
              return (
                <div key={type} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 100px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{labels[type]}</span>
                  <input type="number" className="input" placeholder="Amount (PKR)" value={(form as any)[`${type}_charge_amount`] || ''} onChange={e => set(`${type}_charge_amount`, parseFloat(e.target.value) || 0)} />
                  <select className="input" value={(form as any)[`${type}_charge_status`]} onChange={e => set(`${type}_charge_status`, e.target.value)}>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              );
            })}
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

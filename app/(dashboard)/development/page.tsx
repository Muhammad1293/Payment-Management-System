'use client';
// app/(dashboard)/development/page.tsx
import { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';

interface DevEvent {
  id: string; title: string; description: string;
  contribution_amount: number; event_date: string;
  total_contributors: number; paid_count: number;
  collected_amount: number; pending_amount: number;
}

interface Contribution {
  id: string; resident_name: string; house_number: string;
  amount: number; status: 'paid'|'unpaid'; paid_at: string;
  receipt_number: string; event_title: string; resident_id: string;
}

export default function DevelopmentPage() {
  const { toast }           = useToast();
  const [events, setEvents] = useState<DevEvent[]>([]);
  const [showModal, setShowModal]     = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DevEvent | null>(null);
  const [contributions, setContribs]  = useState<Contribution[]>([]);
  const [loadingContribs, setLoadingContribs] = useState(false);
  const [payingId, setPayingId]       = useState<string | null>(null);

  const loadEvents = () => {
    fetch('/api/development/events').then(r => r.json()).then(({ data }) => setEvents(data || []));
  };

  useEffect(() => { loadEvents(); }, []);

  const openEvent = (ev: DevEvent) => {
    setSelectedEvent(ev);
    setLoadingContribs(true);
    fetch(`/api/development/contributions?event_id=${ev.id}`)
      .then(r => r.json()).then(({ data }) => setContribs(data || []))
      .finally(() => setLoadingContribs(false));
  };

  const payContribution = async (c: Contribution) => {
    setPayingId(c.id);
    try {
      const res = await fetch('/api/development/contributions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contribution_id: c.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(`Payment recorded! Receipt: ${data.data.receipt_number}`);
        openEvent(selectedEvent!);
        loadEvents();
      } else toast(data.error || 'Payment failed', 'error');
    } finally { setPayingId(null); }
  };

  const unpaid  = contributions.filter(c => c.status === 'unpaid');
  const paid    = contributions.filter(c => c.status === 'paid');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Development Contributions</h1>
          <p className="page-sub">Society development events and resident contributions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Event
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedEvent ? '340px 1fr' : '1fr', gap: 20 }}>
        {/* Events list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
              No events yet. Create one to get started.
            </div>
          )}
          {events.map(ev => {
            const progress = ev.total_contributors > 0 ? (ev.paid_count / ev.total_contributors) * 100 : 0;
            const isActive = selectedEvent?.id === ev.id;
            return (
              <div
                key={ev.id}
                className="card"
                onClick={() => openEvent(ev)}
                style={{
                  cursor: 'pointer', padding: 18,
                  borderColor: isActive ? 'var(--accent)' : undefined,
                  background: isActive ? 'var(--accent-dim)' : undefined,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{ev.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {new Date(ev.event_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
                    PKR {ev.contribution_amount.toLocaleString()}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'var(--green)', borderRadius: 2, transition: 'width 0.4s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>{ev.paid_count}/{ev.total_contributors} paid</span>
                  <span>PKR {(ev.collected_amount || 0).toLocaleString()} collected</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contributions detail */}
        {selectedEvent && (
          <div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{selectedEvent.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {unpaid.length} pending · {paid.length} paid
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedEvent(null)}>✕ Close</button>
              </div>

              {loadingContribs ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr><th>Resident</th><th>House</th><th>Amount</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {contributions.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.resident_name}</td>
                        <td><span className="badge badge-blue">H-{c.house_number}</span></td>
                        <td style={{ fontWeight: 600 }}>PKR {c.amount.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${c.status === 'paid' ? 'badge-green' : 'badge-red'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td>
                          {c.status === 'unpaid' ? (
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={payingId === c.id}
                              onClick={() => payContribution(c)}
                            >
                              {payingId === c.id ? '…' : 'Collect'}
                            </button>
                          ) : (
                            <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.receipt_number}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <EventModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadEvents(); toast('Event created and residents enrolled'); }}
        />
      )}
    </div>
  );
}

function EventModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', contribution_amount: 0, event_date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title || !form.contribution_amount || !form.event_date) { setError('All fields are required'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/development/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) onSaved();
      else { const d = await res.json(); setError(d.error || 'Failed'); }
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>New Development Event</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>{error}</div>}
          <div className="form-group">
            <label className="label">Event Title *</label>
            <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Boundary Wall Construction" />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional details…" rows={2} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="label">Contribution Per Resident (PKR) *</label>
              <input type="number" className="input" value={form.contribution_amount || ''} onChange={e => set('contribution_amount', parseFloat(e.target.value) || 0)} placeholder="Amount" />
            </div>
            <div className="form-group">
              <label className="label">Event Date *</label>
              <input type="date" className="input" value={form.event_date} onChange={e => set('event_date', e.target.value)} />
            </div>
          </div>
          <div style={{ background: 'var(--blue-dim)', border: '1px solid var(--blue)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--blue)' }}>
            ℹ All active residents will be automatically enrolled in this event.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Creating…' : 'Create Event'}</button>
        </div>
      </div>
    </div>
  );
}

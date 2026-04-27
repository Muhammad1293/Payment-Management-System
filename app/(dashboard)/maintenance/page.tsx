'use client';
// app/(dashboard)/maintenance/page.tsx
import { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import Select from 'react-select';

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

interface Resident {
  id: string; name: string; house_number: string;
  floor_number: number; monthly_charge: number; status: string;
}
interface Due {
  id: string; month: number; year: number; amount: number; status: string;
}
interface Payment {
  id: string; receipt_number: string; total_amount: number;
  payment_date: string; resident_name: string; house_number: string;
  collected_by_name: string;
}

export default function MaintenancePage() {
  const { toast }               = useToast();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [payments, setPayments]   = useState<Payment[]>([]);
  const [selectedRes, setSelectedRes] = useState('');
  const [dues, setDues]         = useState<Due[]>([]);
  const [selectedDues, setSelectedDues] = useState<string[]>([]);
  const [notes, setNotes]       = useState('');
  const [paying, setPaying]     = useState(false);
  const [loadingDues, setLoadingDues] = useState(false);
  const [tab, setTab]           = useState<'pay'|'history'>('pay');

  const resident = residents.find(r => r.id === selectedRes);
  const total    = dues.filter(d => selectedDues.includes(d.id)).reduce((s, d) => s + d.amount, 0);

  useEffect(() => {
    fetch('/api/residents?status=active').then(r => r.json()).then(({ data }) => setResidents(data || []));
    loadPayments();
  }, []);

  const loadPayments = () => {
    fetch('/api/maintenance/payments').then(r => r.json()).then(({ data }) => setPayments(data || []));
  };

  useEffect(() => {
    if (!selectedRes) { setDues([]); setSelectedDues([]); return; }
    setLoadingDues(true);
    fetch(`/api/maintenance/dues?resident_id=${selectedRes}&status=unpaid`)
      .then(r => r.json()).then(({ data }) => {
        setDues(data || []);
        setSelectedDues((data || []).map((d: Due) => d.id)); // pre-select all
      }).finally(() => setLoadingDues(false));
  }, [selectedRes]);

  const toggleDue = (id: string) => {
    setSelectedDues(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const pay = async () => {
    if (!selectedRes || selectedDues.length === 0) { toast('Select resident and at least one month', 'error'); return; }
    setPaying(true);
    try {
      const res = await fetch('/api/maintenance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resident_id: selectedRes, due_ids: selectedDues, notes }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(`Payment recorded! Receipt: ${data.data.receipt_number}`);
        setSelectedRes('');
        setDues([]);
        setSelectedDues([]);
        setNotes('');
        loadPayments();
      } else {
        toast(data.error || 'Payment failed', 'error');
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-sub">Collect monthly maintenance payments</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {(['pay', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 20px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
            background: tab === t ? 'var(--bg-elevated)' : 'transparent',
            color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
          }}>
            {t === 'pay' ? 'Collect Payment' : 'Payment History'}
          </button>
        ))}
      </div>

      {tab === 'pay' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
          {/* Left: Select resident + dues */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text-secondary)' }}>
                STEP 1 — SELECT RESIDENT
              </h3>
            <Select
  options={residents.map(r => ({
    value: r.id,
    label: `${r.name} — House ${r.house_number}, Floor ${
  r.floor_number === 0 ? 'G' : r.floor_number
}`,
  }))}

  value={
    residents.find(r => r.id === selectedRes)
      ? {
          value: selectedRes,
           label: `${resident?.name} — House ${resident?.house_number}, Floor ${
            resident?.floor_number === 0 ? 'G' : resident?.floor_number
          }`,
        }
      : null
  }

  onChange={(selected) => setSelectedRes(selected?.value || '')}

  placeholder="Search by resident name or house number..."
  isSearchable

  styles={{
    control: (base, state) => ({
      ...base,
      backgroundColor: 'var(--bg-elevated)',
      borderColor: state.isFocused ? 'var(--accent)' : 'var(--border)',
      color: 'var(--text-primary)',
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

              {resident && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 13 }}>
                  <div style={{ color: 'var(--text-secondary)' }}>Monthly charge:</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>
                    PKR {resident.monthly_charge.toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {selectedRes && (
              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--text-secondary)' }}>
                  STEP 2 — SELECT MONTHS TO PAY
                </h3>

                {loadingDues ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Loading dues…</div>
                ) : dues.length === 0 ? (
                  <div style={{ color: 'var(--green)', textAlign: 'center', padding: 20, fontSize: 14 }}>
                    ✓ No pending dues for this resident
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDues(dues.map(d => d.id))}>Select All</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDues([])}>Clear</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {dues.map(d => (
                        <label key={d.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                          background: selectedDues.includes(d.id) ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                          border: `1px solid ${selectedDues.includes(d.id) ? 'var(--accent)' : 'transparent'}`,
                          transition: 'all 0.15s',
                        }}>
                          <input
                            type="checkbox"
                            checked={selectedDues.includes(d.id)}
                            onChange={() => toggleDue(d.id)}
                            style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{MONTHS[d.month]} {d.year}</div>
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            PKR {d.amount.toLocaleString()}
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: Payment summary */}
          <div className="card" style={{ position: 'sticky', top: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
              PAYMENT SUMMARY
            </h3>

            {!selectedRes ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                Select a resident to begin
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>Resident</div>
                  <div style={{ fontWeight: 600 }}>{resident?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>House {resident?.house_number}</div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Months selected</div>
                  {selectedDues.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>None selected</span>
                  ) : (
                    dues.filter(d => selectedDues.includes(d.id)).map(d => (
                      <div key={d.id} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {MONTHS[d.month]} {d.year} — PKR {d.amount.toLocaleString()}
                      </div>
                    ))
                  )}
                </div>

                <div style={{
                  borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Total Amount</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
                    PKR {total.toLocaleString()}
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="label">Notes (optional)</label>
                  <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any remarks…" />
                </div>

                <button
                  className="btn btn-primary"
                  onClick={pay}
                  disabled={paying || selectedDues.length === 0 || total === 0}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  {paying ? 'Recording…' : `Collect PKR ${total.toLocaleString()}`}
                </button>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                  Receipt will be emailed to resident automatically
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Payment History */
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Receipt</th><th>Resident</th><th>House</th><th>Amount</th><th>Collected By</th><th>Date</th></tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td><span className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{p.receipt_number}</span></td>
                  <td style={{ fontWeight: 500 }}>{p.resident_name}</td>
                  <td><span className="badge badge-blue">H-{p.house_number}</span></td>
                  <td style={{ fontWeight: 700 }}>PKR {p.total_amount.toLocaleString()}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{p.collected_by_name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    {new Date(p.payment_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No payments yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';
// app/(dashboard)/maintenance/dues/page.tsx
import { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Due {
  id: string; month: number; year: number; amount: number;
  status: string; resident_name: string; resident_email: string;
  house_number: string; resident_id: string;
}

export default function PendingDuesPage() {
  const { toast }               = useToast();
  const [dues, setDues]         = useState<Due[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filterYear, setFilterYear]   = useState(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [search, setSearch]     = useState('');
  const [paying, setPaying]     = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ status: 'unpaid' });
    if (filterYear)  params.set('year', filterYear);
    if (filterMonth) params.set('month', filterMonth);
    fetch(`/api/maintenance/dues?${params}`)
      .then(r => r.json())
      .then(({ data }) => setDues(data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterYear, filterMonth]);

  const filtered = dues.filter(d =>
    !search ||
    d.resident_name.toLowerCase().includes(search.toLowerCase()) ||
    d.house_number.includes(search)
  );

  const totalPending = filtered.reduce((s, d) => s + d.amount, 0);

  // Quick-pay a single due
  const quickPay = async (due: Due) => {
    setPaying(due.id);
    try {
      const res = await fetch('/api/maintenance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resident_id: due.resident_id, due_ids: [due.id] }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(`Paid! Receipt: ${data.data.receipt_number}`);
        load();
      } else {
        toast(data.error || 'Payment failed', 'error');
      }
    } finally {
      setPaying(null);
    }
  };

  const years = Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pending Dues</h1>
          <p className="page-sub">
            {filtered.length} unpaid · PKR {totalPending.toLocaleString()} outstanding
          </p>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 20,
        padding: '14px 20px',
        background: 'var(--red-dim)', border: '1px solid var(--red)',
        borderRadius: 10, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span style={{ color: 'var(--red)', fontSize: 14, fontWeight: 500 }}>
          {filtered.length} unpaid dues totalling PKR {totalPending.toLocaleString()} for {MONTHS[parseInt(filterMonth)]} {filterYear}
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input" placeholder="Search resident or house…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 220 }}
        />
        <select className="input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ maxWidth: 130 }}>
          {MONTHS.slice(1).map((m, i) => (
            <option key={i + 1} value={String(i + 1)}>{m}</option>
          ))}
        </select>
        <select className="input" value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ maxWidth: 100 }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Resident</th>
                <th>House</th>
                <th>Period</th>
                <th>Amount</th>
                <th>Quick Pay</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{d.resident_name}</div>
                    {d.resident_email && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.resident_email}</div>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-blue">H-{d.house_number}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {MONTHS[d.month]} {d.year}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--red)' }}>
                    PKR {d.amount.toLocaleString()}
                  </td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={paying === d.id}
                      onClick={() => quickPay(d)}
                    >
                      {paying === d.id ? '…' : 'Collect'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--green)' }}>
                    ✓ No pending dues for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

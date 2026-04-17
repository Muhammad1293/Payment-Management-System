'use client';
// app/(dashboard)/dashboard/page.tsx
import { useEffect, useState } from 'react';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(n: number) {
  return 'PKR ' + n.toLocaleString('en-PK');
}

interface Stats {
  total_houses: number;
  active_residents: number;
  pending_dues_count: number;
  pending_dues_amount: number;
  monthly_income: number;
  monthly_expenses: number;
  net_balance: number;
}

interface Payment {
  receipt_number: string;
  total_amount: number;
  payment_date: string;
  resident_name: string;
  house_number: string;
}

export default function DashboardPage() {
  const [stats, setStats]           = useState<Stats | null>(null);
  const [payments, setPayments]     = useState<Payment[]>([]);
  const [currentMonth, setMonth]    = useState('');
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(({ data }) => {
        setStats(data.stats);
        setPayments(data.recent_payments);
        setMonth(data.current_month);
      })
      .finally(() => setLoading(false));
  }, []);

  const STAT_CARDS = stats ? [
    { label: 'Total Houses',       value: stats.total_houses,        sub: 'Registered',              color: 'var(--blue)' },
    { label: 'Active Residents',   value: stats.active_residents,    sub: 'Currently active',        color: 'var(--green)' },
    { label: 'Pending Dues',       value: stats.pending_dues_count,  sub: fmt(stats.pending_dues_amount), color: 'var(--red)' },
    { label: 'Monthly Income',     value: fmt(stats.monthly_income), sub: 'This month',              color: 'var(--accent)' },
    { label: 'Monthly Expenses',   value: fmt(stats.monthly_expenses), sub: 'This month',            color: 'var(--red)' },
    { label: 'Net Balance',
      value: fmt(stats.net_balance),
      sub: stats.net_balance >= 0 ? 'Surplus' : 'Deficit',
      color: stats.net_balance >= 0 ? 'var(--green)' : 'var(--red)',
    },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Overview for {currentMonth || '…'}</p>
        </div>
        <GenerateDuesButton />
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading stats…</div>
      ) : (
        <>
          {/* Stat grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16, marginBottom: 32,
          }}>
            {STAT_CARDS.map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: typeof s.value === 'string' ? 18 : 28 }}>
                  {s.value}
                </div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Recent payments */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent Payments</h2>
            </div>
            {payments.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                No payments recorded yet
              </div>
            ) : (
              <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Receipt</th><th>Resident</th><th>House No</th>
                      <th>Amount</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={i}>
                        <td><span className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{p.receipt_number}</span></td>
                        <td>{p.resident_name}</td>
                        <td><span className="badge badge-blue">{p.house_number}</span></td>
                        <td style={{ fontWeight: 600 }}>{fmt(p.total_amount)}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          {new Date(p.payment_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function GenerateDuesButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState('');

  const generate = async () => {
    setLoading(true);
    const now = new Date();
    try {
      const res = await fetch('/api/maintenance/dues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: now.getMonth() + 1, year: now.getFullYear() }),
      });
      const { data } = await res.json();
      setMsg(`Generated ${data.generated}, skipped ${data.skipped}`);
      setTimeout(() => setMsg(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {msg && <span style={{ fontSize: 13, color: 'var(--green)' }}>{msg}</span>}
      <button className="btn btn-primary btn-sm" onClick={generate} disabled={loading}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        {loading ? 'Generating…' : 'Generate This Month Dues'}
      </button>
    </div>
  );
}

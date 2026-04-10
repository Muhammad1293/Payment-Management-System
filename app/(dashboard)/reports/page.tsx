'use client';
// app/(dashboard)/reports/page.tsx
import { useState } from 'react';

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

type ReportType = 'monthly_income' | 'pending_dues' | 'development' | 'summary';

export default function ReportsPage() {
  const [type, setType]     = useState<ReportType>('monthly_income');
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  // Filters
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear]   = useState(String(now.getFullYear()));
  const [from, setFrom]   = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`);
  const [to, setTo]       = useState(now.toISOString().split('T')[0]);

  const run = async () => {
    setLoading(true); setError(''); setData(null);
    try {
      const params = new URLSearchParams({ type });
      if (type === 'monthly_income') { params.set('month', month); params.set('year', year); }
      if (type === 'pending_dues' && year) { params.set('year', year); if (month) params.set('month', month); }
      if (type === 'summary') { params.set('from', from); params.set('to', to); }
      const res = await fetch(`/api/reports?${params}`);
      const json = await res.json();
      if (res.ok) setData(json.data);
      else setError(json.error || 'Failed to generate report');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const REPORT_TYPES: { value: ReportType; label: string }[] = [
    { value: 'monthly_income', label: 'Monthly Income' },
    { value: 'pending_dues',   label: 'Pending Dues' },
    { value: 'development',    label: 'Development' },
    { value: 'summary',        label: 'Income vs Expenses' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub">Financial summaries and analysis</p>
        </div>
      </div>

      {/* Report selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {REPORT_TYPES.map(r => (
            <button key={r.value} onClick={() => { setType(r.value); setData(null); }} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
              background: type === r.value ? 'var(--accent)' : 'var(--bg-elevated)',
              color: type === r.value ? '#0f1623' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {(type === 'monthly_income' || type === 'pending_dues') && (
            <>
              <div className="form-group">
                <label className="label">Month</label>
                <select className="input" value={month} onChange={e => setMonth(e.target.value)} style={{ minWidth: 130 }}>
                  {type === 'pending_dues' && <option value="">All Months</option>}
                  {MONTHS.slice(1).map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Year</label>
                <select className="input" value={year} onChange={e => setYear(e.target.value)} style={{ minWidth: 100 }}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}
          {type === 'summary' && (
            <>
              <div className="form-group">
                <label className="label">From</label>
                <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">To</label>
                <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
              </div>
            </>
          )}
          <button className="btn btn-primary" onClick={run} disabled={loading} style={{ marginBottom: 2 }}>
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
        </div>
      </div>

      {error && <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 10, padding: '14px 20px', color: 'var(--red)', marginBottom: 16 }}>{error}</div>}

      {/* Results */}
      {data && !loading && (
        <>
          {type === 'monthly_income' && <MonthlyIncomeReport data={data} />}
          {type === 'pending_dues'   && <PendingDuesReport data={data} />}
          {type === 'development'    && <DevelopmentReport data={data} />}
          {type === 'summary'        && <SummaryReport data={data} />}
        </>
      )}
    </div>
  );
}

function MonthlyIncomeReport({ data }: { data: any }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div className="stat-card" style={{ flex: 1 }}>
          <div className="stat-label">Total Payments</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{data.totals?.count ?? 0}</div>
        </div>
        <div className="stat-card" style={{ flex: 1 }}>
          <div className="stat-label">Total Collected</div>
          <div className="stat-value" style={{ fontSize: 22, color: 'var(--accent)' }}>
            PKR {(data.totals?.total || 0).toLocaleString()}
          </div>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Receipt</th><th>Resident</th><th>House</th><th>Amount</th><th>Date</th></tr></thead>
          <tbody>
            {data.payments?.map((p: any, i: number) => (
              <tr key={i}>
                <td><span className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{p.receipt_number}</span></td>
                <td>{p.resident_name}</td>
                <td><span className="badge badge-blue">H-{p.house_number}</span></td>
                <td style={{ fontWeight: 700 }}>PKR {p.total_amount.toLocaleString()}</td>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{new Date(p.payment_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
              </tr>
            ))}
            {!data.payments?.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No payments found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PendingDuesReport({ data }: { data: any }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div className="stat-card" style={{ flex: 1 }}>
          <div className="stat-label">Pending Dues</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{data.summary?.total_count ?? 0}</div>
        </div>
        <div className="stat-card" style={{ flex: 1 }}>
          <div className="stat-label">Total Pending</div>
          <div className="stat-value" style={{ fontSize: 22, color: 'var(--red)' }}>
            PKR {(data.summary?.total_amount || 0).toLocaleString()}
          </div>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Resident</th><th>House</th><th>Floor</th><th>Month</th><th>Amount</th></tr></thead>
          <tbody>
            {data.dues?.map((d: any, i: number) => (
              <tr key={i}>
                <td>
                  <div style={{ fontWeight: 500 }}>{d.resident_name}</div>
                  {d.resident_email && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.resident_email}</div>}
                </td>
                <td><span className="badge badge-blue">H-{d.house_number}</span></td>
                <td style={{ color: 'var(--text-secondary)' }}>Floor {d.floor_number}</td>
                <td>{MONTHS[d.month]} {d.year}</td>
                <td style={{ fontWeight: 700, color: 'var(--red)' }}>PKR {d.amount.toLocaleString()}</td>
              </tr>
            ))}
            {!data.dues?.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No pending dues</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DevelopmentReport({ data }: { data: any }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr><th>Event</th><th>Date</th><th>Per Resident</th><th>Paid</th><th>Pending</th><th>Collected</th></tr></thead>
        <tbody>
          {data.events?.map((e: any, i: number) => (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>{e.title}</td>
              <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{new Date(e.event_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
              <td>PKR {e.contribution_amount.toLocaleString()}</td>
              <td><span className="badge badge-green">{e.paid_count}</span></td>
              <td><span className="badge badge-red">{e.unpaid_count}</span></td>
              <td style={{ fontWeight: 700, color: 'var(--green)' }}>PKR {(e.collected_amount || 0).toLocaleString()}</td>
            </tr>
          ))}
          {!data.events?.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No events found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function SummaryReport({ data }: { data: any }) {
  const net = data.net_balance;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {[
          { label: 'Maintenance Income', value: data.income?.maintenance, color: 'var(--green)' },
          { label: 'Development Income', value: data.income?.development, color: 'var(--blue)' },
          { label: 'Total Income',       value: data.income?.total,       color: 'var(--accent)' },
          { label: 'Total Expenses',     value: data.expenses?.total,     color: 'var(--red)' },
          { label: 'Net Balance',        value: net, color: net >= 0 ? 'var(--green)' : 'var(--red)' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: 20, color: s.color }}>PKR {(s.value || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {data.expenses?.by_category?.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Expenses by Category</div>
          <table className="data-table">
            <thead><tr><th>Category</th><th>Amount</th></tr></thead>
            <tbody>
              {data.expenses.by_category.map((c: any, i: number) => (
                <tr key={i}>
                  <td>{c.category || 'Uncategorised'}</td>
                  <td style={{ fontWeight: 700, color: 'var(--red)' }}>PKR {c.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

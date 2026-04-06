'use client';
// app/(dashboard)/expenses/page.tsx
import { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';

interface Expense {
  id: string; title: string; amount: number; expense_date: string;
  category_name: string; recorded_by_name: string; notes: string;
}
interface Category { id: string; name: string; }

export default function ExpensesPage() {
  const { toast }             = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editExp, setEditExp] = useState<Expense | null>(null);
  const [filterCat, setFilterCat]   = useState('');
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCat) params.set('category_id', filterCat);
    if (from)      params.set('from', from);
    if (to)        params.set('to', to);
    Promise.all([
      fetch(`/api/expenses?${params}`).then(r => r.json()),
      fetch('/api/expenses/categories').then(r => r.json()),
    ]).then(([e, c]) => {
      setExpenses(e.data || []);
      setCategories(c.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterCat, from, to]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const deleteExp = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) { toast('Expense deleted'); load(); }
    else toast('Failed to delete', 'error');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-sub">{expenses.length} records · Total: PKR {total.toLocaleString()}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditExp(null); setShowModal(true); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Expense
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} style={{ maxWidth: 160 }} />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>to</span>
        <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} style={{ maxWidth: 160 }} />
        {(filterCat || from || to) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterCat(''); setFrom(''); setTo(''); }}>Clear</button>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 60 }}>Loading…</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Title</th><th>Category</th><th>Amount</th><th>Date</th><th>Recorded By</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{e.title}</div>
                    {e.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.notes}</div>}
                  </td>
                  <td>
                    {e.category_name ? (
                      <span className="badge badge-blue">{e.category_name}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Uncategorised</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--red)' }}>PKR {e.amount.toLocaleString()}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    {new Date(e.expense_date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{e.recorded_by_name}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditExp(e); setShowModal(true); }}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteExp(e.id, e.title)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No expenses recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ExpenseModal
          expense={editExp}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); toast(editExp ? 'Expense updated' : 'Expense added'); }}
        />
      )}
    </div>
  );
}

function ExpenseModal({ expense, categories, onClose, onSaved }: {
  expense: Expense | null; categories: Category[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title:        expense?.title        || '',
    amount:       expense?.amount       || 0,
    expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
    category_id:  '',
    notes:        expense?.notes        || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title || !form.amount || !form.expense_date) { setError('Title, amount and date are required'); return; }
    setSaving(true); setError('');
    try {
      const url = expense ? `/api/expenses/${expense.id}` : '/api/expenses';
      const method = expense ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) onSaved();
      else { const d = await res.json(); setError(d.error || 'Failed'); }
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>{expense ? 'Edit Expense' : 'Add Expense'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>{error}</div>}
          <div className="form-group">
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Generator fuel" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="label">Amount (PKR) *</label>
              <input type="number" className="input" value={form.amount || ''} onChange={e => set('amount', parseFloat(e.target.value) || 0)} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.expense_date} onChange={e => set('expense_date', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Category</label>
            <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
              <option value="">Select category…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Notes</label>
            <textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional remarks…" rows={2} style={{ resize: 'vertical' }} />
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

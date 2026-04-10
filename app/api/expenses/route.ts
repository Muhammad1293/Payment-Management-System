// app/api/expenses/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbAll, dbRun, generateId } from '@/lib/db';
import { ok, created, badRequest, serverError } from '@/lib/api-response';



// GET /api/expenses?category_id=&from=&to=
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { DB } = getCFEnv();
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');
    const from       = searchParams.get('from');
    const to         = searchParams.get('to');

    let query = `
      SELECT e.*, ec.name AS category_name, u.name AS recorded_by_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.id = e.category_id
      JOIN users u ON u.id = e.recorded_by
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (categoryId) { query += ' AND e.category_id = ?';     params.push(categoryId); }
    if (from)       { query += ' AND e.expense_date >= ?';   params.push(from); }
    if (to)         { query += ' AND e.expense_date <= ?';   params.push(to); }

    query += ' ORDER BY e.expense_date DESC';

    const expenses = await dbAll(DB, query, params);
    return ok(expenses);
  } catch (err) {
    return serverError('Failed to fetch expenses', err);
  }
}

// POST /api/expenses
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant');
  if ('status' in auth) return auth;

  try {
    const { title, amount, expense_date, category_id, notes } = await req.json();

    if (!title || amount === undefined || !expense_date) {
      return badRequest('title, amount, expense_date are required');
    }
    if (amount <= 0) return badRequest('amount must be positive');

    const { DB } = getCFEnv();
    const id = generateId();

    await dbRun(DB, `
      INSERT INTO expenses (id, category_id, title, amount, expense_date, recorded_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, category_id ?? null, title, amount, expense_date, auth.user.sub, notes ?? null]);

    return created({ id, title, amount, expense_date });
  } catch (err) {
    return serverError('Failed to create expense', err);
  }
}

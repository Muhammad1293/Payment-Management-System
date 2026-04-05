// app/api/expenses/[id]/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbFirst, dbRun } from '@/lib/db';
import { ok, badRequest, notFound, serverError } from '@/lib/api-response';

export const runtime = 'edge';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, 'admin', 'accountant');
  if ('status' in auth) return auth;

  try {
    const { DB } = getCFEnv();
    const expense = await dbFirst(DB, `SELECT id FROM expenses WHERE id = ?`, [params.id]);
    if (!expense) return notFound('Expense not found');

    const body = await req.json();
    const allowed = ['title', 'amount', 'expense_date', 'category_id', 'notes'];
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }

    if (fields.length === 0) return badRequest('Nothing to update');
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(params.id);

    await dbRun(DB, `UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`, values);
    return ok({ id: params.id, updated: true });
  } catch (err) {
    return serverError('Failed to update expense', err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, 'admin', 'accountant');
  if ('status' in auth) return auth;

  try {
    const { DB } = getCFEnv();
    await dbRun(DB, `DELETE FROM expenses WHERE id = ?`, [params.id]);
    return ok({ id: params.id, deleted: true });
  } catch (err) {
    return serverError('Failed to delete expense', err);
  }
}

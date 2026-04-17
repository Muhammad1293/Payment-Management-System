// app/api/expenses/categories/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbAll, dbRun, generateId } from '@/lib/db';
import { ok, created, badRequest, serverError } from '@/lib/api-response';



export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { DB } = await getCFEnv();
    const cats = await dbAll(DB, `SELECT * FROM expense_categories ORDER BY name`);
    return ok(cats);
  } catch (err) {
    return serverError('Failed to fetch categories', err);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'admin');
  if ('status' in auth) return auth;

  try {
    const { name } = await req.json();
    if (!name) return badRequest('name is required');

    const { DB } = await getCFEnv();
    const id = generateId();
    await dbRun(DB, `INSERT INTO expense_categories (id, name) VALUES (?, ?)`, [id, name]);
    return created({ id, name });
  } catch (err) {
    return serverError('Failed to create category', err);
  }
}

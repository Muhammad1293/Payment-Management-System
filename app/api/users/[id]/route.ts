// app/api/users/[id]/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbFirst, dbRun } from '@/lib/db';
import { ok, badRequest, notFound, serverError } from '@/lib/api-response';



export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {  
const { id } = await params;
  const auth = await requireAuth(req, 'admin');
  if ('status' in auth) return auth;

  try {
    const { DB } = getCFEnv();
    const user = await dbFirst(DB,
      `SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?`,
      [id]
    );
    if (!user) return notFound('User not found');
    return ok(user);
  } catch (err) {
    return serverError('Failed to fetch user', err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {  
const { id } = await params;
  const auth = await requireAuth(req, 'admin');
  if ('status' in auth) return auth;

  try {
    const { DB } = getCFEnv();
    const body = await req.json();
    const { name, role, is_active } = body;

    const user = await dbFirst(DB, `SELECT id FROM users WHERE id = ?`, [id]);
    if (!user) return notFound('User not found');

    // Build dynamic update
    const fields: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined)      { fields.push('name = ?');      values.push(name); }
    if (role !== undefined)      { fields.push('role = ?');      values.push(role); }
    if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }

    if (fields.length === 0) return badRequest('Nothing to update');

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await dbRun(DB, `UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    return ok({ id: id, updated: true });
  } catch (err) {
    return serverError('Failed to update user', err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {  
const { id } = await params;
  const auth = await requireAuth(req, 'admin');
  if ('status' in auth) return auth;

  // Soft-delete: deactivate
  try {
    const { DB } = getCFEnv();
    const user = await dbFirst(DB, `SELECT id FROM users WHERE id = ?`, [id]);
    if (!user) return notFound('User not found');

    await dbRun(DB, `UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
    return ok({ id: id, deactivated: true });
  } catch (err) {
    return serverError('Failed to delete user', err);
  }
}

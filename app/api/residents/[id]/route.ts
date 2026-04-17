// app/api/residents/[id]/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbFirst, dbRun } from '@/lib/db';
import { ok, badRequest, notFound, serverError } from '@/lib/api-response';



export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {  
const { id } = await params;
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { DB } = await getCFEnv();
    const resident = await dbFirst(DB, `
      SELECT r.*, h.house_number
      FROM residents r JOIN houses h ON h.id = r.house_id
      WHERE r.id = ?
    `, [id]);
    if (!resident) return notFound('Resident not found');
    return ok(resident);
  } catch (err) {
    return serverError('Failed to fetch resident', err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {  
const { id } = await params;
  const auth = await requireAuth(req, 'admin', 'accountant');
  if ('status' in auth) return auth;

  try {
    const { DB } = await getCFEnv();
    const resident = await dbFirst(DB, `SELECT id FROM residents WHERE id = ?`, [id]);
    if (!resident) return notFound('Resident not found');

    const body = await req.json();
    const allowed = ['name', 'email', 'phone', 'resident_type', 'floor_number', 'monthly_charge', 'status'];

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
    values.push(id);

    await dbRun(DB, `UPDATE residents SET ${fields.join(', ')} WHERE id = ?`, values);
    return ok({ id: id, updated: true });
  } catch (err) {
    return serverError('Failed to update resident', err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {  
const { id } = await params;
  const auth = await requireAuth(req, 'admin');
  if ('status' in auth) return auth;

  try {
    const { DB } = await getCFEnv();
    await dbRun(DB, `DELETE FROM residents WHERE id = ?`, [id]);
    return ok({ id: id, deleted: true });
  } catch (err) {
    return serverError('Failed to delete resident', err);
  }
}

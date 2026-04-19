// app/api/houses/[id]/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbFirst, dbRun, dbAll } from '@/lib/db';
import { ok, badRequest, notFound, serverError } from '@/lib/api-response';



// GET /api/houses/:id — full house detail + residents
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {  
const { id } = await params;
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { DB } = await getCFEnv();

    const house = await dbFirst(DB, `SELECT * FROM houses WHERE id = ?`, [id]);
    if (!house) return notFound('House not found');

    const residents = await dbAll(DB,
      `SELECT * FROM residents WHERE house_id = ? ORDER BY floor_number, name`,
      [id]
    );

    return ok({ ...house, residents });
  } catch (err) {
    return serverError('Failed to fetch house', err);
  }
}

// PATCH /api/houses/:id
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {  
const { id } = await params;
  const auth = await requireAuth(req, 'admin', 'accountant');
  if ('status' in auth) return auth;

  try {
    const { DB } = await getCFEnv();
    const house = await dbFirst(DB, `SELECT id FROM houses WHERE id = ?`, [id]);
    if (!house) return notFound('House not found');

    const body = await req.json();
   const allowed = [
 'house_number',
 'owner_name',
 'notes',

 'dev_charge_status',
 'elec_charge_status',
 'gas_charge_status',

 'dev_charge_paid_at',
 'elec_charge_paid_at',
 'gas_charge_paid_at',

 'dev_charge_amount',
 'elec_charge_amount',
 'gas_charge_amount'
];
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of allowed) {
  if (body[key] !== undefined) {
    fields.push(`${key} = ?`);

    if (key === 'house_number') {
      values.push(String(body[key]).toUpperCase().trim());
    } else if (key === 'owner_name' || key === 'notes') {
      values.push(String(body[key]).trim());
    } else {
      values.push(body[key]);
    }
  }
}

    if (fields.length === 0) return badRequest('Nothing to update');

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await dbRun(DB, `UPDATE houses SET ${fields.join(', ')} WHERE id = ?`, values);
    return ok({ id: id, updated: true });
  } catch (err) {
    return serverError('Failed to update house', err);
  }
}

// DELETE /api/houses/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAuth(req, 'admin', 'accountant');
  if ('status' in auth) return auth;

  try {
    const { DB } = await getCFEnv();

    const house = await dbFirst(
      DB,
      `SELECT id, house_number FROM houses WHERE id = ?`,
      [id]
    );

    if (!house) return notFound('House not found');

    // Check residents linked to this house
    const linked = await dbFirst<{ total: number }>(
      DB,
      `SELECT COUNT(*) as total FROM residents WHERE house_id = ?`,
      [id]
    );

    if ((linked?.total || 0) > 0) {
      return badRequest(
        `Cannot delete house ${house.house_number}. Remove or transfer residents first.`
      );
    }

    await dbRun(DB, `DELETE FROM houses WHERE id = ?`, [id]);

    return ok({
      id,
      deleted: true
    });

  } catch (err) {
    return serverError('Failed to delete house', err);
  }
}

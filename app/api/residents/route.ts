// app/api/residents/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbAll, dbFirst, dbRun, generateId } from '@/lib/db';
import { ok, created, badRequest, notFound, serverError } from '@/lib/api-response';



// GET /api/residents?house_id=&status=active
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { DB } = getCFEnv();
    const { searchParams } = new URL(req.url);
    const houseId = searchParams.get('house_id');
    const status  = searchParams.get('status');

    let query = `
      SELECT r.*, h.house_number
      FROM residents r
      JOIN houses h ON h.id = r.house_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (houseId) { query += ' AND r.house_id = ?'; params.push(houseId); }
    if (status)  { query += ' AND r.status = ?';   params.push(status); }

    query += ' ORDER BY h.house_number, r.floor_number, r.name';

    const residents = await dbAll(DB, query, params);
    return ok(residents);
  } catch (err) {
    return serverError('Failed to fetch residents', err);
  }
}

// POST /api/residents
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant');
  if ('status' in auth) return auth;

  try {
    const body = await req.json();
    const { house_id, name, email, phone, resident_type, floor_number = 1, monthly_charge } = body;

    if (!house_id || !name || !resident_type || monthly_charge === undefined) {
      return badRequest('house_id, name, resident_type, monthly_charge are required');
    }
    if (!['owner', 'tenant'].includes(resident_type)) {
      return badRequest('resident_type must be owner or tenant');
    }

    const { DB } = getCFEnv();

    const house = await dbFirst(DB, `SELECT id FROM houses WHERE id = ?`, [house_id]);
    if (!house) return notFound('House not found');

    const id = generateId();
    await dbRun(DB, `
      INSERT INTO residents (id, house_id, name, email, phone, resident_type, floor_number, monthly_charge)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, house_id, name, email ?? null, phone ?? null, resident_type, floor_number, monthly_charge]);

    return created({ id, name, house_id });
  } catch (err) {
    return serverError('Failed to create resident', err);
  }
}

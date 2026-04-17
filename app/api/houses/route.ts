// app/api/houses/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbAll, dbFirst, dbRun, generateId } from '@/lib/db';
import { ok, created, badRequest, conflict, serverError } from '@/lib/api-response';



// GET /api/houses
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { DB } = await getCFEnv();
    const houses = await dbAll(DB, `
      SELECT
        h.*,
        COUNT(r.id)                                    AS total_residents,
        SUM(CASE WHEN r.status = 'active' THEN 1 END)  AS active_residents
      FROM houses h
      LEFT JOIN residents r ON r.house_id = h.id
      GROUP BY h.id
      ORDER BY h.house_number
    `);
    return ok(houses);
  } catch (err) {
    return serverError('Failed to fetch houses', err);
  }
}

// POST /api/houses
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant');
  if ('status' in auth) return auth;

  try {
    const body = await req.json();
    const { house_number, num_floors = 1, notes } = body;

    if (!house_number) return badRequest('house_number is required');

    const { DB } = await getCFEnv();

    const existing = await dbFirst(DB, `SELECT id FROM houses WHERE house_number = ?`, [house_number]);
    if (existing) return conflict(`House ${house_number} already exists`);

    const id = generateId();
    await dbRun(DB,
      `INSERT INTO houses (id, house_number, num_floors, notes) VALUES (?, ?, ?, ?)`,
      [id, house_number, num_floors, notes ?? null]
    );

    return created({ id, house_number, num_floors });
  } catch (err) {
    return serverError('Failed to create house', err);
  }
}

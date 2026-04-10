// app/api/maintenance/dues/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbAll, dbFirst, dbRun, dbBatch, generateId } from '@/lib/db';
import { ok, created, badRequest, serverError } from '@/lib/api-response';



// GET /api/maintenance/dues?resident_id=&status=unpaid&year=&month=
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { DB } = getCFEnv();
    const { searchParams } = new URL(req.url);
    const residentId = searchParams.get('resident_id');
    const status     = searchParams.get('status');
    const year       = searchParams.get('year');
    const month      = searchParams.get('month');

    let query = `
      SELECT
        md.*,
        r.name AS resident_name,
        r.email AS resident_email,
        h.house_number
      FROM maintenance_dues md
      JOIN residents r ON r.id = md.resident_id
      JOIN houses h ON h.id = md.house_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (residentId) { query += ' AND md.resident_id = ?'; params.push(residentId); }
    if (status)     { query += ' AND md.status = ?';      params.push(status); }
    if (year)       { query += ' AND md.year = ?';        params.push(parseInt(year)); }
    if (month)      { query += ' AND md.month = ?';       params.push(parseInt(month)); }

    query += ' ORDER BY md.year DESC, md.month DESC';

    const dues = await dbAll(DB, query, params);
    return ok(dues);
  } catch (err) {
    return serverError('Failed to fetch dues', err);
  }
}

// POST /api/maintenance/dues/generate
// Body: { month: number, year: number }
// Generates dues for ALL active residents for given month/year (idempotent)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant');
  if ('status' in auth) return auth;

  try {
    const { month, year } = await req.json();

    if (!month || !year || month < 1 || month > 12) {
      return badRequest('Valid month (1-12) and year are required');
    }

    const { DB } = getCFEnv();

    // Fetch all active residents
    const residents = await dbAll<{
      id: string; house_id: string; monthly_charge: number;
    }>(DB, `SELECT id, house_id, monthly_charge FROM residents WHERE status = 'active'`);

    if (residents.length === 0) {
      return ok({ generated: 0, skipped: 0, message: 'No active residents' });
    }

    let generated = 0;
    let skipped   = 0;

    const statements: { query: string; params: unknown[] }[] = [];

    for (const r of residents) {
      const existing = await dbFirst(DB,
        `SELECT id FROM maintenance_dues WHERE resident_id = ? AND month = ? AND year = ?`,
        [r.id, month, year]
      );
      if (existing) { skipped++; continue; }

      statements.push({
        query: `INSERT INTO maintenance_dues (id, resident_id, house_id, month, year, amount)
                VALUES (?, ?, ?, ?, ?, ?)`,
        params: [generateId(), r.id, r.house_id, month, year, r.monthly_charge],
      });
      generated++;
    }

    if (statements.length > 0) {
      await dbBatch(DB, statements);
    }

    return ok({ generated, skipped, month, year });
  } catch (err) {
    return serverError('Failed to generate dues', err);
  }
}

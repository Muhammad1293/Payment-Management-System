// app/api/receipts/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbAll } from '@/lib/db';
import { ok, serverError } from '@/lib/api-response';



// GET /api/receipts?type=&resident_id=&from=&to=
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { DB } = getCFEnv();
    const { searchParams } = new URL(req.url);
    const type       = searchParams.get('type');
    const residentId = searchParams.get('resident_id');
    const from       = searchParams.get('from');
    const to         = searchParams.get('to');

    let query = `
      SELECT
        rc.*,
        r.name  AS resident_name,
        h.house_number
      FROM receipts rc
      LEFT JOIN residents r ON r.id = rc.resident_id
      LEFT JOIN houses h    ON h.id = rc.house_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (type)       { query += ' AND rc.receipt_type = ?';   params.push(type); }
    if (residentId) { query += ' AND rc.resident_id = ?';    params.push(residentId); }
    if (from)       { query += ' AND rc.issued_at >= ?';     params.push(from); }
    if (to)         { query += ' AND rc.issued_at <= ?';     params.push(to + 'T23:59:59'); }

    query += ' ORDER BY rc.issued_at DESC LIMIT 200';

    const receipts = await dbAll(DB, query, params);
    return ok(receipts);
  } catch (err) {
    return serverError('Failed to fetch receipts', err);
  }
}

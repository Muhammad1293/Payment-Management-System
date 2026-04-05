// app/api/development/events/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbAll, dbFirst, dbRun, generateId } from '@/lib/db';
import { ok, created, badRequest, serverError } from '@/lib/api-response';

export const runtime = 'edge';

// GET /api/development/events
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { DB } = getCFEnv();
    const events = await dbAll(DB, `
      SELECT
        de.*,
        u.name AS created_by_name,
        COUNT(dc.id)                                          AS total_contributors,
        SUM(CASE WHEN dc.status = 'paid' THEN 1 ELSE 0 END)  AS paid_count,
        SUM(CASE WHEN dc.status = 'paid' THEN dc.amount END)  AS collected_amount
      FROM development_events de
      LEFT JOIN users u ON u.id = de.created_by
      LEFT JOIN development_contributions dc ON dc.event_id = de.id
      GROUP BY de.id
      ORDER BY de.event_date DESC
    `);
    return ok(events);
  } catch (err) {
    return serverError('Failed to fetch events', err);
  }
}

// POST /api/development/events
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant');
  if ('status' in auth) return auth;

  try {
    const { title, description, contribution_amount, event_date } = await req.json();

    if (!title || !contribution_amount || !event_date) {
      return badRequest('title, contribution_amount, event_date are required');
    }

    const { DB } = getCFEnv();
    const id = generateId();

    await dbRun(DB, `
      INSERT INTO development_events (id, title, description, contribution_amount, event_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, title, description ?? null, contribution_amount, event_date, auth.user.sub]);

    // Auto-create contribution records for all active residents
    const residents = await dbAll<{ id: string; house_id: string }>(
      DB, `SELECT id, house_id FROM residents WHERE status = 'active'`
    );

    if (residents.length > 0) {
      const stmts = residents.map(r => ({
        query: `INSERT OR IGNORE INTO development_contributions
                (id, event_id, resident_id, house_id, amount)
                VALUES (?, ?, ?, ?, ?)`,
        params: [generateId(), id, r.id, r.house_id, contribution_amount],
      }));
      const { dbBatch } = await import('@/lib/db');
      await dbBatch(DB, stmts);
    }

    return created({ id, title, contribution_amount, residents_enrolled: residents.length });
  } catch (err) {
    return serverError('Failed to create development event', err);
  }
}

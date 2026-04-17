// app/api/development/contributions/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbAll, dbFirst, dbRun, generateId, generateReceiptNumber } from '@/lib/db';
import { ok, created, badRequest, notFound, serverError } from '@/lib/api-response';
import { sendReceiptEmail } from '@/lib/email';




// GET /api/development/contributions?event_id=&resident_id=&status=
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { DB } = await getCFEnv();
    const { searchParams } = new URL(req.url);
    const eventId    = searchParams.get('event_id');
    const residentId = searchParams.get('resident_id');
    const status     = searchParams.get('status');

    let query = `
      SELECT
        dc.*,
        r.name  AS resident_name,
        r.email AS resident_email,
        h.house_number,
        de.title AS event_title
      FROM development_contributions dc
      JOIN residents r         ON r.id  = dc.resident_id
      JOIN houses h            ON h.id  = dc.house_id
      JOIN development_events de ON de.id = dc.event_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (eventId)    { query += ' AND dc.event_id = ?';    params.push(eventId); }
    if (residentId) { query += ' AND dc.resident_id = ?'; params.push(residentId); }
    if (status)     { query += ' AND dc.status = ?';      params.push(status); }

    query += ' ORDER BY h.house_number, r.name';

    const contributions = await dbAll(DB, query, params);
    return ok(contributions);
  } catch (err) {
    return serverError('Failed to fetch contributions', err);
  }
}

// POST /api/development/contributions/:id/pay  (handled below as separate route)
// POST /api/development/contributions — pay a contribution
// Body: { contribution_id }
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { contribution_id, notes } = await req.json();
    if (!contribution_id) return badRequest('contribution_id is required');

    const { DB } = await getCFEnv();

    const contribution = await dbFirst<{
      id: string; event_id: string; resident_id: string; house_id: string;
      amount: number; status: string;
    }>(DB, `SELECT * FROM development_contributions WHERE id = ?`, [contribution_id]);

    if (!contribution) return notFound('Contribution not found');
    if (contribution.status === 'paid') return badRequest('Contribution already paid');

    const resident = await dbFirst<{ name: string; email: string }>(
      DB, `SELECT name, email FROM residents WHERE id = ?`, [contribution.resident_id]
    );
    const event = await dbFirst<{ title: string }>(
      DB, `SELECT title FROM development_events WHERE id = ?`, [contribution.event_id]
    );

    const receiptNumber = generateReceiptNumber('DEV');
    const now = new Date().toISOString();

    // Update contribution
    await dbRun(DB, `
      UPDATE development_contributions
      SET status = 'paid', paid_at = ?, collected_by = ?, receipt_number = ?, notes = ?
      WHERE id = ?
    `, [now, auth.user.sub, receiptNumber, notes ?? null, contribution_id]);

    // Insert receipt record
    await dbRun(DB, `
      INSERT INTO receipts (id, receipt_number, receipt_type, reference_id, resident_id, house_id, amount, issued_at)
      VALUES (?, ?, 'development', ?, ?, ?, ?, ?)
    `, [generateId(), receiptNumber, contribution_id, contribution.resident_id, contribution.house_id, contribution.amount, now]);

    // Send email (non-blocking)
    if (resident?.email) {
      sendReceiptEmail({
        to: resident.email,
        residentName: resident.name,
        receiptNumber,
        paymentType: `Society Development Contribution – ${event?.title ?? ''}`,
        amount: contribution.amount,
        date: now,
      }).catch(console.error);
    }

    return created({
      contribution_id,
      receipt_number: receiptNumber,
      amount: contribution.amount,
    });
  } catch (err) {
    return serverError('Failed to record contribution payment', err);
  }
}

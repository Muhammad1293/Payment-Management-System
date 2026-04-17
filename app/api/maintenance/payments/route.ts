// app/api/maintenance/payments/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbAll, dbFirst, dbRun, dbBatch, generateId, generateReceiptNumber } from '@/lib/db';
import { ok, created, badRequest, notFound, serverError } from '@/lib/api-response';
import { sendReceiptEmail } from '@/lib/email';



// GET /api/maintenance/payments?resident_id=&year=
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { DB } = await getCFEnv();
    const { searchParams } = new URL(req.url);
    const residentId = searchParams.get('resident_id');
    const year = searchParams.get('year');

    let query = `
      SELECT
        mp.*,
        r.name AS resident_name,
        h.house_number,
        u.name AS collected_by_name
      FROM maintenance_payments mp
      JOIN residents r ON r.id = mp.resident_id
      JOIN houses   h ON h.id = mp.house_id
      JOIN users    u ON u.id = mp.collected_by
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (residentId) { query += ' AND mp.resident_id = ?'; params.push(residentId); }
    if (year)       { query += " AND strftime('%Y', mp.payment_date) = ?"; params.push(year); }

    query += ' ORDER BY mp.payment_date DESC';

    const payments = await dbAll(DB, query, params);
    return ok(payments);
  } catch (err) {
    return serverError('Failed to fetch payments', err);
  }
}

// POST /api/maintenance/payments
// Body: { resident_id, due_ids: string[], notes? }
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { resident_id, due_ids, notes } = await req.json();

    if (!resident_id || !Array.isArray(due_ids) || due_ids.length === 0) {
      return badRequest('resident_id and due_ids[] are required');
    }

    const { DB } = await getCFEnv();

    // Validate resident
    const resident = await dbFirst<{
      id: string; name: string; email: string; house_id: string;
    }>(DB, `SELECT id, name, email, house_id FROM residents WHERE id = ?`, [resident_id]);
    if (!resident) return notFound('Resident not found');

    // Validate dues — must all be unpaid and belong to this resident
    const placeholders = due_ids.map(() => '?').join(',');
    const dues = await dbAll<{
      id: string; month: number; year: number; amount: number; status: string; resident_id: string;
    }>(DB, `SELECT * FROM maintenance_dues WHERE id IN (${placeholders})`, due_ids);

    if (dues.length !== due_ids.length) {
      return badRequest('One or more dues not found');
    }
    const invalidDues = dues.filter(d => d.resident_id !== resident_id || d.status !== 'unpaid');
    if (invalidDues.length > 0) {
      return badRequest('One or more dues are already paid or do not belong to this resident');
    }

    const totalAmount = dues.reduce((sum, d) => sum + d.amount, 0);
    const paymentId     = generateId();
    const receiptNumber = generateReceiptNumber('MNT');
    const now           = new Date().toISOString();

    // 1. Insert payment
    await dbRun(DB, `
      INSERT INTO maintenance_payments (id, resident_id, house_id, collected_by, total_amount, payment_date, receipt_number, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [paymentId, resident_id, resident.house_id, auth.user.sub, totalAmount, now, receiptNumber, notes ?? null]);

    // 2. Create payment_dues entries
    const dueLinkStmts = due_ids.map((dueId: string) => ({
      query: `INSERT INTO payment_dues (payment_id, due_id) VALUES (?, ?)`,
      params: [paymentId, dueId],
    }));

    // 3. Mark dues as paid
    const dueUpdateStmts = due_ids.map((dueId: string) => ({
      query: `UPDATE maintenance_dues SET status = 'paid', paid_at = ? WHERE id = ?`,
      params: [now, dueId],
    }));

    // 4. Insert receipt record
    const receiptStmt = {
      query: `INSERT INTO receipts (id, receipt_number, receipt_type, reference_id, resident_id, house_id, amount, issued_at)
              VALUES (?, ?, 'maintenance', ?, ?, ?, ?, ?)`,
      params: [generateId(), receiptNumber, paymentId, resident_id, resident.house_id, totalAmount, now],
    };

    await dbBatch(DB, [...dueLinkStmts, ...dueUpdateStmts, receiptStmt]);

    // 5. Send email (non-blocking)
    if (resident.email) {
     await sendReceiptEmail({
        to: resident.email,
        residentName: resident.name,
        receiptNumber,
        paymentType: 'Monthly Maintenance',
        amount: totalAmount,
        date: now,
        months: dues.map(d => ({ month: d.month, year: d.year })),
      }).catch((err) => {
  console.error('[EMAIL FAILED]', err?.message, err);
});
    }

    return created({
      payment_id: paymentId,
      receipt_number: receiptNumber,
      total_amount: totalAmount,
      dues_paid: due_ids.length,
    });
  } catch (err) {
    return serverError('Failed to record payment', err);
  }
}

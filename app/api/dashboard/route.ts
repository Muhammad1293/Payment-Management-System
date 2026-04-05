// app/api/dashboard/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbFirst, dbAll } from '@/lib/db';
import { ok, serverError } from '@/lib/api-response';

export const runtime = 'edge';

// GET /api/dashboard — overview stats for current month
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { DB } = getCFEnv();
    const now   = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year  = String(now.getFullYear());

    const [
      houses,
      residents,
      pendingDues,
      monthlyIncome,
      thisMonthExpenses,
      recentPayments,
    ] = await Promise.all([
      // Total houses
      dbFirst<{ count: number }>(DB, `SELECT COUNT(*) AS count FROM houses`),

      // Active residents
      dbFirst<{ count: number }>(DB, `SELECT COUNT(*) AS count FROM residents WHERE status = 'active'`),

      // Unpaid dues this month
      dbFirst<{ count: number; amount: number }>(DB, `
        SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
        FROM maintenance_dues
        WHERE status = 'unpaid' AND month = ? AND year = ?
      `, [parseInt(month), parseInt(year)]),

      // Income collected this month (maintenance)
      dbFirst<{ total: number }>(DB, `
        SELECT COALESCE(SUM(total_amount), 0) AS total
        FROM maintenance_payments
        WHERE strftime('%m', payment_date) = ? AND strftime('%Y', payment_date) = ?
      `, [month, year]),

      // Expenses this month
      dbFirst<{ total: number }>(DB, `
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE strftime('%m', expense_date) = ? AND strftime('%Y', expense_date) = ?
      `, [month, year]),

      // 5 recent payments
      dbAll(DB, `
        SELECT mp.receipt_number, mp.total_amount, mp.payment_date,
               r.name AS resident_name, h.house_number
        FROM maintenance_payments mp
        JOIN residents r ON r.id = mp.resident_id
        JOIN houses h    ON h.id = mp.house_id
        ORDER BY mp.payment_date DESC
        LIMIT 5
      `),
    ]);

    return ok({
      current_month: `${year}-${month}`,
      stats: {
        total_houses:       houses?.count ?? 0,
        active_residents:   residents?.count ?? 0,
        pending_dues_count: pendingDues?.count ?? 0,
        pending_dues_amount: pendingDues?.amount ?? 0,
        monthly_income:     monthlyIncome?.total ?? 0,
        monthly_expenses:   thisMonthExpenses?.total ?? 0,
        net_balance:        (monthlyIncome?.total ?? 0) - (thisMonthExpenses?.total ?? 0),
      },
      recent_payments: recentPayments,
    });
  } catch (err) {
    return serverError('Failed to fetch dashboard', err);
  }
}

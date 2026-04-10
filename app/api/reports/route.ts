// app/api/reports/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbAll, dbFirst } from '@/lib/db';
import { ok, badRequest, serverError } from '@/lib/api-response';



// GET /api/reports?type=monthly_income|pending_dues|development|summary&month=&year=&from=&to=
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { DB } = getCFEnv();
    const { searchParams } = new URL(req.url);
    const type  = searchParams.get('type');
    const month = searchParams.get('month');
    const year  = searchParams.get('year');
    const from  = searchParams.get('from');
    const to    = searchParams.get('to');

    switch (type) {

      // ── Monthly Income ──────────────────────────────────────
      case 'monthly_income': {
        if (!month || !year) return badRequest('month and year required');

        const maintenance = await dbAll(DB, `
          SELECT
            mp.receipt_number,
            mp.payment_date,
            mp.total_amount,
            r.name  AS resident_name,
            h.house_number
          FROM maintenance_payments mp
          JOIN residents r ON r.id = mp.resident_id
          JOIN houses h    ON h.id = mp.house_id
          WHERE strftime('%m', mp.payment_date) = ? AND strftime('%Y', mp.payment_date) = ?
          ORDER BY mp.payment_date DESC
        `, [String(month).padStart(2, '0'), year]);

        const totals = await dbFirst<{ total: number; count: number }>(DB, `
          SELECT SUM(total_amount) AS total, COUNT(*) AS count
          FROM maintenance_payments
          WHERE strftime('%m', payment_date) = ? AND strftime('%Y', payment_date) = ?
        `, [String(month).padStart(2, '0'), year]);

        return ok({ type, month, year, payments: maintenance, totals });
      }

      // ── Pending Dues ────────────────────────────────────────
      case 'pending_dues': {
        const params: unknown[] = [];
        let query = `
          SELECT
            md.month, md.year, md.amount,
            r.name  AS resident_name,
            r.email AS resident_email,
            h.house_number,
            r.floor_number
          FROM maintenance_dues md
          JOIN residents r ON r.id = md.resident_id
          JOIN houses h    ON h.id = md.house_id
          WHERE md.status = 'unpaid'
        `;
        if (year)  { query += ' AND md.year = ?';  params.push(parseInt(year)); }
        if (month) { query += ' AND md.month = ?'; params.push(parseInt(month)); }
        query += ' ORDER BY h.house_number, md.year, md.month';

        const dues = await dbAll(DB, query, params);

        const summary = await dbFirst<{ total_amount: number; total_count: number }>(DB, `
          SELECT SUM(amount) AS total_amount, COUNT(*) AS total_count
          FROM maintenance_dues WHERE status = 'unpaid'
        `);

        return ok({ type, dues, summary });
      }

      // ── Development Contributions ───────────────────────────
      case 'development': {
        const events = await dbAll(DB, `
          SELECT
            de.id, de.title, de.event_date, de.contribution_amount,
            COUNT(dc.id)                                          AS total_residents,
            SUM(CASE WHEN dc.status='paid' THEN 1 ELSE 0 END)    AS paid_count,
            SUM(CASE WHEN dc.status='unpaid' THEN 1 ELSE 0 END)  AS unpaid_count,
            SUM(CASE WHEN dc.status='paid' THEN dc.amount END)   AS collected_amount,
            SUM(CASE WHEN dc.status='unpaid' THEN dc.amount END) AS pending_amount
          FROM development_events de
          LEFT JOIN development_contributions dc ON dc.event_id = de.id
          GROUP BY de.id
          ORDER BY de.event_date DESC
        `);
        return ok({ type, events });
      }

      // ── Income vs Expense Summary ───────────────────────────
      case 'summary': {
        if (!from || !to) return badRequest('from and to date params required (YYYY-MM-DD)');

        const income = await dbFirst<{ total: number }>(DB, `
          SELECT SUM(total_amount) AS total
          FROM maintenance_payments
          WHERE payment_date >= ? AND payment_date <= ?
        `, [from, to + 'T23:59:59']);

        const devIncome = await dbFirst<{ total: number }>(DB, `
          SELECT SUM(amount) AS total
          FROM development_contributions
          WHERE status = 'paid' AND paid_at >= ? AND paid_at <= ?
        `, [from, to + 'T23:59:59']);

        const expenses = await dbFirst<{ total: number }>(DB, `
          SELECT SUM(amount) AS total
          FROM expenses
          WHERE expense_date >= ? AND expense_date <= ?
        `, [from, to]);

        const maintenanceTotal = income?.total ?? 0;
        const devTotal         = devIncome?.total ?? 0;
        const expenseTotal     = expenses?.total ?? 0;
        const totalIncome      = maintenanceTotal + devTotal;
        const netBalance       = totalIncome - expenseTotal;

        // Breakdown by expense category
        const expenseByCategory = await dbAll(DB, `
          SELECT ec.name AS category, SUM(e.amount) AS total
          FROM expenses e
          LEFT JOIN expense_categories ec ON ec.id = e.category_id
          WHERE e.expense_date >= ? AND e.expense_date <= ?
          GROUP BY ec.name
          ORDER BY total DESC
        `, [from, to]);

        return ok({
          type, from, to,
          income: {
            maintenance: maintenanceTotal,
            development: devTotal,
            total: totalIncome,
          },
          expenses: {
            total: expenseTotal,
            by_category: expenseByCategory,
          },
          net_balance: netBalance,
        });
      }

      default:
        return badRequest('type must be: monthly_income | pending_dues | development | summary');
    }
  } catch (err) {
    return serverError('Failed to generate report', err);
  }
}

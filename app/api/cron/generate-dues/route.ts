// app/api/cron/generate-dues/route.ts
// Call this via Cloudflare Cron Trigger or a manual POST on the 1st of each month
// Set up in wrangler.toml:
//   [triggers]
//   crons = ["0 0 1 * *"]   # 00:00 on 1st of every month

import { NextRequest } from 'next/server';
import { getCFEnv } from '@/lib/cf-env';
import { dbAll, dbFirst, dbRun, generateId } from '@/lib/db';
import { ok, serverError } from '@/lib/api-response';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  // Simple security: check a secret header or bypass for cron
  const { DB } = getCFEnv();

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  try {
    const residents = await dbAll<{
      id: string; house_id: string; monthly_charge: number;
    }>(DB, `SELECT id, house_id, monthly_charge FROM residents WHERE status = 'active'`);

    let generated = 0;
    let skipped   = 0;

    for (const r of residents) {
      const existing = await dbFirst(DB,
        `SELECT id FROM maintenance_dues WHERE resident_id = ? AND month = ? AND year = ?`,
        [r.id, month, year]
      );
      if (existing) { skipped++; continue; }

      await dbRun(DB,
        `INSERT INTO maintenance_dues (id, resident_id, house_id, month, year, amount) VALUES (?, ?, ?, ?, ?, ?)`,
        [generateId(), r.id, r.house_id, month, year, r.monthly_charge]
      );
      generated++;
    }

    return ok({ generated, skipped, month, year });
  } catch (err) {
    return serverError('Cron: failed to generate dues', err);
  }
}

// Cloudflare Cron handler (wrangler scheduled event)
export async function GET(req: NextRequest) {
  return ok({ message: 'Use POST to trigger due generation' });
}
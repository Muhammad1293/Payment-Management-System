// app/api/auth/change-password/route.ts
import { NextRequest } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbFirst, dbRun } from '@/lib/db';
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-response';



export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'admin', 'accountant', 'supervisor');
  if ('status' in auth) return auth;

  try {
    const { current_password, new_password } = await req.json();

    if (!current_password || !new_password) {
      return badRequest('current_password and new_password are required');
    }
    if (new_password.length < 8) {
      return badRequest('New password must be at least 8 characters');
    }

    const { DB } = getCFEnv();
    const user = await dbFirst<{ password: string }>(
      DB, `SELECT password FROM users WHERE id = ?`, [auth.user.sub]
    );
    if (!user) return unauthorized();

    const valid = await compare(current_password, user.password);
    if (!valid) return badRequest('Current password is incorrect');

    const hashed = await hash(new_password, 10);
    await dbRun(DB,
      `UPDATE users SET password = ?, updated_at = ? WHERE id = ?`,
      [hashed, new Date().toISOString(), auth.user.sub]
    );

    return ok({ message: 'Password changed successfully' });
  } catch (err) {
    return serverError('Failed to change password', err);
  }
}

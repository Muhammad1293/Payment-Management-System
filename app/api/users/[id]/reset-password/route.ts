import { NextRequest } from 'next/server';
import { hash } from 'bcryptjs';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbFirst, dbRun } from '@/lib/db';
import { ok, notFound, serverError } from '@/lib/api-response';
import { sendPasswordReset } from '@/lib/email';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth(req, 'admin');
  if ('status' in auth) return auth;

  try {
    const { DB } = await getCFEnv();
    const user = await dbFirst<{ name: string; email: string }>(
      DB, `SELECT name, email FROM users WHERE id = ?`, [id]
    );
    if (!user) return notFound('User not found');

    const plainPassword = generatePassword();
    const hashed = await hash(plainPassword, 10);

    await dbRun(DB,
      `UPDATE users SET password = ?, updated_at = ? WHERE id = ?`,
      [hashed, new Date().toISOString(), id]
    );

    const { APP_URL } = await getCFEnv();
   try {
  await sendPasswordReset({
    to: user.email,
    name: user.name,
    newPassword: plainPassword,
    appUrl: APP_URL || 'https://pms.afgarden.workers.dev',
  });

  return ok({ message: 'Password reset and email sent successfully' });

} catch (err: any) {
  console.error('[EMAIL FAILED]', err?.message || err);

  return ok({
    message: 'Password reset successfully, but email could not be sent'
  });
}
  } catch (err) {
    return serverError('Failed to reset password', err);
  }
}
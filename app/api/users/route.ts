// app/api/users/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbAll, dbFirst, dbRun, generateId } from '@/lib/db';
import { ok, created, badRequest, serverError, conflict } from '@/lib/api-response';
import { hash } from 'bcryptjs';
import { sendUserCredentials } from '@/lib/email';



// GET /api/users — list all users (admin only)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin');
  if ('status' in auth) return auth;

  try {
    const { DB } = await getCFEnv();
    const users = await dbAll(DB,
      `SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC`
    );
    return ok(users);
  } catch (err) {
    return serverError('Failed to fetch users', err);
  }
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// POST /api/users — create user (admin only)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'admin');
  if ('status' in auth) return auth;

  try {
    const { name, email, role } = await req.json();

    if (!name || !email || !role) {
      return badRequest('name, email, role are required');
    }
    if (!['admin', 'accountant', 'supervisor'].includes(role)) {
      return badRequest('Invalid role');
    }

    const { DB, APP_URL } = await getCFEnv();

    const existing = await dbFirst(DB, 'SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) return conflict('Email already exists');

    // Auto-generate password
    const plainPassword = generatePassword();
    const hashed = await hash(plainPassword, 10);
    const id = generateId();

    await dbRun(DB,
      `INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)`,
      [id, name, email.toLowerCase(), hashed, role]
    );

    // Send credentials email (non-blocking)
   try {
  await sendUserCredentials({
    to: email,
    name,
    password: plainPassword,
    role,
    appUrl: APP_URL,
  });

  console.log("EMAIL SENT");
} catch (err:any) {
  console.error("EMAIL FAILED:", err?.message || err);
}

    return created({ id, name, email: email.toLowerCase(), role });
  } catch (err) {
    return serverError('Failed to create user', err);
  }
}
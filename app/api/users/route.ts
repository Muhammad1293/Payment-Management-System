// app/api/users/route.ts
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCFEnv } from '@/lib/cf-env';
import { dbAll, dbFirst, dbRun, generateId } from '@/lib/db';
import { ok, created, badRequest, serverError, conflict } from '@/lib/api-response';

export const runtime = 'edge';

// GET /api/users — list all users (admin only)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'admin');
  if ('status' in auth) return auth;

  try {
    const { DB } = getCFEnv();
    const users = await dbAll(DB,
      `SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC`
    );
    return ok(users);
  } catch (err) {
    return serverError('Failed to fetch users', err);
  }
}

// POST /api/users — create user (admin only)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'admin');
  if ('status' in auth) return auth;

  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return badRequest('name, email, password, role are required');
    }
    if (!['admin', 'accountant', 'supervisor'].includes(role)) {
      return badRequest('Invalid role');
    }

    const { DB } = getCFEnv();

    const existing = await dbFirst(DB, 'SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) return conflict('Email already exists');

    const { hash } = await import('bcryptjs');
    const hashed = await hash(password, 10);
    const id = generateId();

    await dbRun(DB,
      `INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)`,
      [id, name, email.toLowerCase(), hashed, role]
    );

    return created({ id, name, email: email.toLowerCase(), role });
  } catch (err) {
    return serverError('Failed to create user', err);
  }
}

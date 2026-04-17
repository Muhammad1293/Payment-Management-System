// app/api/auth/login/route.ts
import { NextRequest } from 'next/server';
import { getCFEnv } from '@/lib/cf-env';
import { dbFirst } from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-response';
import { NextResponse } from 'next/server';


export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return badRequest('Email and password are required');
    }

    const { DB } = await getCFEnv();

    const user = await dbFirst<{
      id: string; name: string; email: string;
      password: string; role: string; is_active: number;
    }>(DB, 'SELECT * FROM users WHERE email = ? AND is_active = 1', [email.toLowerCase()]);

    if (!user) {
      return unauthorized('Invalid email or password');
    }

    // Verify password using Web Crypto (bcrypt not available in CF edge)
    // We use a bcrypt-compatible approach via the bcryptjs WASM port
    const { compare } = await import('bcryptjs');
    const valid = await compare(password, user.password);
    if (!valid) {
      return unauthorized('Invalid email or password');
    }

    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
    });

    const res = ok({ name: user.name, email: user.email, role: user.role });
    return setAuthCookie(res as NextResponse, token);
  } catch (err) {
    return serverError('Login failed', err);
  }
}

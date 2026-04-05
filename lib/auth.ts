// lib/auth.ts
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export type UserRole = 'admin' | 'accountant' | 'supervisor';

export interface JWTPayload {
  sub: string;       // user id
  email: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION_SECRET_KEY_MIN_32_CHARS'
);

const COOKIE_NAME = 'pms_token';

// ── Token helpers ──────────────────────────────────────────────

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ── Cookie helpers ─────────────────────────────────────────────

export function setAuthCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,   // 8 hours
    path: '/',
  });
  return res;
}

export function clearAuthCookie(res: NextResponse): NextResponse {
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return res;
}

// ── Request auth ───────────────────────────────────────────────

export async function getAuthUser(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ── RBAC ───────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  accountant: 2,
  supervisor: 1,
};

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canAccess(userRole: UserRole, ...allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

// ── Route guard helper ─────────────────────────────────────────

export async function requireAuth(
  req: NextRequest,
  ...allowedRoles: UserRole[]
): Promise<{ user: JWTPayload } | NextResponse> {
  const user = await getAuthUser(req);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (allowedRoles.length > 0 && !canAccess(user.role, ...allowedRoles)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { user };
}

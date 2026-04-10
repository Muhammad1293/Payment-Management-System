// app/api/auth/me/route.ts
import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { ok, unauthorized } from '@/lib/api-response';



export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  return ok({ sub: user.sub, email: user.email, name: user.name, role: user.role });
}

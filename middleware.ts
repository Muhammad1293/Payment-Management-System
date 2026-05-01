// middleware.ts (root of project)
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const config = {
  matcher: [
    // Protect all pages except login
    '/((?!api/auth/login|api/debug|_next/static|_next/image|icon.png|login).*)',

    
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Define a helper function to inject our fix into any response
  const applyFiberNetFix = (res: NextResponse) => {
    res.headers.set('Alt-Svc', 'clear');
    // 'no-cache' is faster than 'no-store' because it allows the browser 
    // to keep files but forces it to verify them via TCP (avoiding the reset)
    res.headers.set('Cache-Control', 'no-cache, must-revalidate');
    return res;
  };

  // Allow public API login
  if (pathname.startsWith('/api/auth/login')) {
    return applyFiberNetFix(NextResponse.next());
  }

  const token = req.cookies.get('pms_token')?.value;

  // No token → redirect to login
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return applyFiberNetFix(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }
    return applyFiberNetFix(NextResponse.redirect(new URL('/login', req.url)));
  }

  const user = await verifyToken(token);

  if (!user) {
    if (pathname.startsWith('/api/')) {
      return applyFiberNetFix(NextResponse.json({ error: 'Token expired or invalid' }, { status: 401 }));
    }
    const res = NextResponse.redirect(new URL('/login', req.url));
    res.cookies.set('pms_token', '', { maxAge: 0 });
    return applyFiberNetFix(res);
  }

  // Attach user info to request headers for downstream use
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id',    user.sub);
  requestHeaders.set('x-user-role',  user.role);
  requestHeaders.set('x-user-email', user.email);

  // Apply the fix to the final successful response
  const finalResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  return applyFiberNetFix(finalResponse);
}
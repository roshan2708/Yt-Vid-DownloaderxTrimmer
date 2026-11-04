import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy Convention (replaces deprecated middleware.ts)
 * Intercepts requests to /admin/* before routes are rendered
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public admin login page and its static assets to load
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next();
  }

  // 2. Check for administrative session cookie
  // The client sets "__admin_session" upon verified admin login
  const adminSession = request.cookies.get('__admin_session')?.value;

  if (!adminSession) {
    // Redirect unauthenticated or unauthorized users to /admin/login
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow authorized admin request to proceed to render
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

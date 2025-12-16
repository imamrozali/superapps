import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

// 1. Specify protected and public routes
const protectedRoutes = ['/dashboard'];
const publicRoutes = ['/login', '/signup', '/'];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (req.nextUrl.searchParams.has('_rsc')) {
    return NextResponse.next();
  }


  // Skip middleware for API routes, static files, and Next.js internals
  if (
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  const isProtectedRoute = protectedRoutes.some(route =>
    path.startsWith(route)
  );

  // Decrypt the session from the cookie
  const cookie = req.cookies.get('session')?.value;
  let session = null;

  if (cookie) {
    try {
      session = await decrypt(cookie);
    } catch (error) {
      logger.dev('Session decrypt error:', error);
      const response = NextResponse.redirect(new URL('/login', req.nextUrl));
      response.cookies.delete('session');
      return response;
    }
  }


  logger.dev({ path, isProtectedRoute, hasSession: !!session, userId: session?.userId });

  // Redirect to /login if the user is not authenticated on protected route
  if (isProtectedRoute && !session?.userId) {
    logger.dev('Redirecting to login - no session');
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  // Redirect to /dashboard if the user is authenticated and trying to access login page
  if (path === '/login' && session?.userId) {
    logger.dev('Redirecting to dashboard - already authenticated');
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
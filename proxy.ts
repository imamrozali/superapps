import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth/session';

// Specify protected and public routes
const protectedRoutes = ['/dashboard'];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Skip middleware for RSC requests - let React handle them
  if (req.nextUrl.searchParams.has('_rsc')) {
    return NextResponse.next();
  }

  // Skip middleware for API routes and static files
  if (
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  // Only handle login redirect when authenticated
  if (path === '/login') {
    const cookie = req.cookies.get('session')?.value;
    if (cookie) {
      try {
        const session = await decrypt(cookie);
        if (session?.userId) {
          console.log('[Middleware] Redirecting authenticated user from login to dashboard');
          return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
        }
      } catch (error) {
        console.error('[Middleware] Session decrypt error on login page:', error);
        // Clear invalid session
        const response = NextResponse.next();
        response.cookies.delete('session');
        return response;
      }
    }
  }

  // Let dashboard/layout.tsx handle protected route authentication
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
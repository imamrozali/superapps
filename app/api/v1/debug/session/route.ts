import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

/**
 * Debug endpoint to check session status
 * GET /api/v1/debug/session
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const cookies = request.cookies.getAll();
    
    return NextResponse.json({
      hasSession: !!session,
      session: session ? {
        userId: session.userId,
        organizationId: session.organizationId,
        roles: session.roles,
        permissions: session.permissions,
        expiresAt: session.expiresAt,
      } : null,
      cookies: cookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value?.length || 0,
      })),
      env: {
        hasJwtSecret: !!process.env.JWT_SECRET,
        jwtSecretLength: process.env.JWT_SECRET?.length || 0,
        nodeEnv: process.env.NODE_ENV,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get session',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    }, { status: 500 });
  }
}

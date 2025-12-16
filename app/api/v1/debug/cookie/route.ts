import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to test cookie setting
 * GET /api/v1/debug/cookie
 */
export async function GET(request: NextRequest) {
  const testValue = `test-${Date.now()}`;
  
  const response = NextResponse.json({
    message: 'Cookie test',
    testValue,
    nodeEnv: process.env.NODE_ENV,
    secure: process.env.NODE_ENV === 'production',
  });

  // Set test cookie
  response.cookies.set('test_cookie', testValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60, // 1 minute
    path: '/',
  });

  return response;
}

/**
 * Check if cookie was set
 * POST /api/v1/debug/cookie
 */
export async function POST(request: NextRequest) {
  const testCookie = request.cookies.get('test_cookie');
  const sessionCookie = request.cookies.get('session');
  
  return NextResponse.json({
    testCookie: {
      exists: !!testCookie,
      value: testCookie?.value,
    },
    sessionCookie: {
      exists: !!sessionCookie,
      hasValue: !!sessionCookie?.value,
      length: sessionCookie?.value?.length || 0,
    },
    allCookies: request.cookies.getAll().map(c => ({
      name: c.name,
      hasValue: !!c.value,
    })),
  });
}

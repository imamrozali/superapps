import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth/session';
import { cookies } from 'next/headers';

export async function POST() {
  // Delete session from database
  await deleteSession();
  
  // Create response
  const response = NextResponse.json({ success: true });
  
  // Clear all auth-related cookies
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  };
  
  // Delete all session cookies
  response.cookies.set('session', '', cookieOptions);
  response.cookies.set('session_token', '', cookieOptions);
  response.cookies.set('refresh_token', '', cookieOptions);
  
  return response;
}
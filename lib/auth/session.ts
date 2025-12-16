import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export interface SessionPayload {
  userId: string;
  organizationId?: string;
  organizationUnitId?: string;
  roles: string[];
  permissions: string[];
  expiresAt: Date;
}

const SECRET_KEY = process.env.JWT_SECRET
const encodedKey = new TextEncoder().encode(SECRET_KEY);

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload, expiresAt: payload.expiresAt.toISOString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = '') {
  try {
    // Return null for empty or undefined session
    if (!session || session.trim() === '') {
      return null;
    }
    
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    // Only log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.includes('Invalid Compact JWS')) {
        console.error('Session verification error:', errorMessage);
      }
    }
    return null;
  }
}

export async function createSession(userId: string, organizationId?: string, organizationUnitId?: string, roles: string[] = [], permissions: string[] = []) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const session = await encrypt({
    userId,
    organizationId,
    organizationUnitId,
    roles,
    permissions,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  return await decrypt(session);
}

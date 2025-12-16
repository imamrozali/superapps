import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { db } from '@/lib/db';
import { passkeys, userIdentifiers, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createSessionWithRefresh } from '@/lib/auth/session-manager';
import { encrypt } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const challenge = request.cookies.get('webauthn_auth_challenge')?.value;
  if (!challenge) {
    return NextResponse.json({ error: 'No challenge found' }, { status: 400 });
  }

  const { email, response: authResponse } = await request.json();

  // Find user
  const userData = await db
    .select()
    .from(userIdentifiers)
    .where(and(eq(userIdentifiers.type, 'email'), eq(userIdentifiers.value, email)))
    .leftJoin(users, eq(userIdentifiers.userId, users.id))
    .limit(1);

  if (!userData.length) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userId = userData[0].user_identifiers.userId;

  // Get passkey
  const passkeyData = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.credentialId, authResponse.id))
    .limit(1);

  if (!passkeyData.length) {
    return NextResponse.json({ error: 'Passkey not found' }, { status: 404 });
  }

  const passkey = passkeyData[0];

  try {
    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: challenge,
      expectedOrigin: process.env.EXPECTED_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.RP_ID || 'localhost',
      credential: {
        id: passkey.credentialId,
        publicKey: Buffer.from(passkey.publicKey, 'base64url'),
        counter: parseInt(passkey.counter),
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    // Update counter
    await db
      .update(passkeys)
      .set({ counter: verification.authenticationInfo.newCounter.toString() })
      .where(eq(passkeys.id, passkey.id));

    // Create session
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     undefined;

    const { sessionToken, refreshToken: refreshTokenValue } = await createSessionWithRefresh(
      userId,
      userAgent,
      ipAddress
    );

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const sessionPayload = await encrypt({
      userId,
      organizationId: undefined,
      organizationUnitId: undefined,
      roles: [],
      permissions: [],
      expiresAt,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', sessionPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    response.cookies.set('refresh_token', refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Passkey auth verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }
}
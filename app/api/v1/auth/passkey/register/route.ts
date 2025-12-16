import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.userId;

  // In a real app, get existing passkeys for this user
  const existingPasskeys: any[] = []; // TODO: fetch from DB

  const options = await generateRegistrationOptions({
    rpName: 'SuperApps',
    rpID: process.env.RP_ID || 'localhost',
    userID: new Uint8Array(Buffer.from(userId, 'utf-8')),
    userName: `user-${userId}`, // TODO: get real username
    userDisplayName: `User ${userId}`,
    attestationType: 'none',
    excludeCredentials: existingPasskeys.map(passkey => ({
      id: passkey.credentialId,
      type: 'public-key',
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  // Store challenge in session or DB (simplified, using cookie for demo)
  const response = NextResponse.json(options);
  response.cookies.set('webauthn_challenge', options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 300, // 5 minutes
  });

  return response;
}
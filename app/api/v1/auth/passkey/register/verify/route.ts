import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { passkeys } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const challenge = request.cookies.get('webauthn_challenge')?.value;
  if (!challenge) {
    return NextResponse.json({ error: 'No challenge found' }, { status: 400 });
  }

  const { response: registrationResponse } = await request.json();

  const userId = session.userId;

  try {
    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: challenge,
      expectedOrigin: process.env.EXPECTED_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.RP_ID || 'localhost',
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { credential } = verification.registrationInfo!;

    // Store the passkey
    await db.insert(passkeys).values({
      userId,
      credentialId: Buffer.from(credential.id).toString('base64url'),
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter.toString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Passkey registration verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }
}
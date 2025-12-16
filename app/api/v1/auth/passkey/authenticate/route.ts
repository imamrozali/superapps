import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { db } from '@/lib/db';
import { passkeys, userIdentifiers, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  console.log('Passkey authenticate email:', email);

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  // Find user by email
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

  // Get user's passkeys
  const userPasskeys = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.userId, userId));

  if (!userPasskeys.length) {
    return NextResponse.json({ error: 'No passkeys registered' }, { status: 400 });
  }

  const options = await generateAuthenticationOptions({
    rpID: process.env.RP_ID || 'localhost',
    allowCredentials: userPasskeys.map(passkey => ({
      id: passkey.credentialId,
      type: 'public-key',
    })),
    userVerification: 'preferred',
  });

  // Store challenge
  const response = NextResponse.json(options);
  response.cookies.set('webauthn_auth_challenge', options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 300,
  });

  return response;
}
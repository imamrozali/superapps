import { NextRequest, NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { authenticatorSecrets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function decryptSecret(encrypted: string): string {
  // In real app, proper decryption, but for demo, this is not secure
  // For production, use proper encryption
  // This is not real decryption, just placeholder
  return encrypted; // TODO: implement proper decrypt
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.userId;
  const { code } = await request.json();

  // Get secret
  const secretData = await db
    .select()
    .from(authenticatorSecrets)
    .where(eq(authenticatorSecrets.userId, userId))
    .limit(1);

  if (!secretData.length) {
    return NextResponse.json({ error: 'TOTP not set up' }, { status: 400 });
  }

  const secret = decryptSecret(secretData[0].encryptedSecret);

  const isValid = authenticator.verify({ token: code, secret });

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
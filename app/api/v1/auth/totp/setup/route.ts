import { NextRequest, NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { authenticatorSecrets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createHmac } from 'crypto';

function encryptSecret(secret: string): string {
  const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-prod';
  const hmac = createHmac('sha256', key);
  hmac.update(secret);
  return hmac.digest('hex');
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.userId;

  // Check if already has secret
  const existing = await db
    .select()
    .from(authenticatorSecrets)
    .where(eq(authenticatorSecrets.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: 'TOTP already set up' }, { status: 400 });
  }

  // Generate secret
  const secret = authenticator.generateSecret();

  // Encrypt and store
  const encrypted = encryptSecret(secret);
  await db.insert(authenticatorSecrets).values({
    userId,
    encryptedSecret: encrypted,
  });

  // Generate QR code URL
  const otpauth = authenticator.keyuri(userId, 'SuperApps', secret);

  return NextResponse.json({ secret, otpauth });
}
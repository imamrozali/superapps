import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/db';
import { users, userIdentifiers, oauthAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createSessionWithRefresh } from '@/lib/auth/session-manager';
import { encrypt } from '@/lib/auth/session';
import { v4 as uuidv4 } from 'uuid';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google/callback`
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: googleUser } = await oauth2.userinfo.get();

    if (!googleUser.email || !googleUser.id) {
      return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
    }

    // Check if OAuth account exists
    const oauthAccount = await db
      .select()
      .from(oauthAccounts)
      .where(eq(oauthAccounts.providerId, googleUser.id))
      .limit(1);

    let userId: string;

    if (oauthAccount.length > 0) {
      // Existing user
      userId = oauthAccount[0].userId;
    } else {
      // Check if email exists
      const existingUser = await db
        .select()
        .from(userIdentifiers)
        .where(and(eq(userIdentifiers.value, googleUser.email), eq(userIdentifiers.type, 'email')))
        .limit(1);

      if (existingUser.length > 0) {
        // Link to existing user
        userId = existingUser[0].userId;
      } else {
        // Create new user
        userId = uuidv4();
        await db.insert(users).values({
          id: userId,
          status: 'active',
        });

        await db.insert(userIdentifiers).values({
          userId,
          type: 'email',
          value: googleUser.email,
          verified: googleUser.verified_email || false,
        });
      }

      // Create OAuth account
      await db.insert(oauthAccounts).values({
        userId,
        provider: 'google',
        providerId: googleUser.id,
        providerData: JSON.stringify(googleUser),
      });
    }

    // For simplicity, assume user has membership (in real app, handle org selection)
    // TODO: Handle org context

    // Create session
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     undefined;

    const { sessionToken, refreshToken } = await createSessionWithRefresh(
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

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
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

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, userIdentifiers, oauthAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createSessionWithRefresh } from '@/lib/auth/session-manager';
import { encrypt } from '@/lib/auth/session';
import { v4 as uuidv4 } from 'uuid';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
    }

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'SuperApps',
      },
    });

    const githubUser = await userResponse.json();

    // Get emails
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'SuperApps',
      },
    });

    const emails = await emailsResponse.json();
    const primaryEmail = emails.find((e: any) => e.primary)?.email || githubUser.email;

    if (!primaryEmail || !githubUser.id) {
      return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
    }

    // Check if OAuth account exists
    let oauthAccount = await db
      .select()
      .from(oauthAccounts)
      .where(eq(oauthAccounts.providerId, githubUser.id.toString()))
      .limit(1);

    let userId: string;

    if (oauthAccount.length > 0) {
      userId = oauthAccount[0].userId;
    } else {
      // Check if email exists
      const existingUser = await db
        .select()
        .from(userIdentifiers)
        .where(and(eq(userIdentifiers.value, primaryEmail), eq(userIdentifiers.type, 'email')))
        .limit(1);

      if (existingUser.length > 0) {
        userId = existingUser[0].userId;
      } else {
        userId = uuidv4();
        await db.insert(users).values({
          id: userId,
          status: 'active',
        });

        await db.insert(userIdentifiers).values({
          userId,
          type: 'email',
          value: primaryEmail,
          verified: true,
        });
      }

      // Create OAuth account
      await db.insert(oauthAccounts).values({
        userId,
        provider: 'github',
        providerId: githubUser.id.toString(),
        providerData: JSON.stringify(githubUser),
      });
    }

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
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }
}
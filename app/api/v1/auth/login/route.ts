import { NextRequest, NextResponse } from 'next/server';
import { findUserByIdentifier, getPasswordCredential, verifyPassword } from '@/lib/auth';
import { createSessionWithRefresh } from '@/lib/auth/session-manager';
import { encrypt } from '@/lib/auth/session';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { organizationMemberships, roleAssignments, permissions, rolePermissions } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Find user by email
    const userData = await findUserByIdentifier('email', email);
    if (!userData || !userData.user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Get password credential
    const passwordCred = await getPasswordCredential(userData.user.id);
    if (!passwordCred) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const isValid = await verifyPassword(passwordCred.passwordHash, password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Get user's memberships and roles (for now, take first membership or none)
    const memberships = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userData.user.id));

    let orgId: string | undefined;
    let unitId: string | undefined;
    let userRoles: string[] = [];
    let userPermissions: string[] = [];

    if (memberships.length > 0) {
      const membership = memberships[0]; // TODO: handle multiple orgs

      // Get roles for this membership
      const roleIds = await db
        .select({ roleId: roleAssignments.roleId })
        .from(roleAssignments)
        .where(eq(roleAssignments.membershipId, membership.id));

      // Get permissions for these roles
      const roleIdsList = roleIds.map(r => r.roleId);
      const permCodes = roleIdsList.length > 0 ? await db
        .select({ code: permissions.code })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(inArray(rolePermissions.roleId, roleIdsList)) : [];

      orgId = membership.organizationId;
      unitId = membership.organizationUnitId || undefined;
      userRoles = roleIdsList;
      userPermissions = permCodes.map(p => p.code);
    }
    // Create session in database
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     undefined;

    const { sessionToken, refreshToken } = await createSessionWithRefresh(
      userData.user.id,
      userAgent,
      ipAddress
    );

    // Create JWT session payload
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const sessionPayload = await encrypt({
      userId: userData.user.id,
      organizationId: orgId,
      organizationUnitId: unitId,
      roles: userRoles,
      permissions: userPermissions,
      expiresAt,
    });

    // Set cookies
    const response = NextResponse.json({ 
      success: true,
      user: {
        id: userData.user.id,
        email: email,
      }
    });

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
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      path: '/',
    });

    console.log('Login successful for user:', userData.user.id);
    console.log('Session cookie set:', {
      hasSession: !!sessionPayload,
      expiresAt: expiresAt.toISOString(),
      isProduction: process.env.NODE_ENV === 'production'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
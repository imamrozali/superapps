import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userIdentifiers, passwordCredentials, organizations, organizationMemberships, roles, roleAssignments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await db
      .select()
      .from(userIdentifiers)
      .where(and(eq(userIdentifiers.type, 'email'), eq(userIdentifiers.value, email)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Create user
    const userId = uuidv4();
    await db.insert(users).values({
      id: userId,
      status: 'active',
    });

    // Create email identifier
    await db.insert(userIdentifiers).values({
      userId,
      type: 'email',
      value: email,
      verified: false,
    });

    // If username provided, create username identifier
    if (username) {
      await db.insert(userIdentifiers).values({
        userId,
        type: 'username',
        value: username,
        verified: true,
      });
    }

    // Create password credential
    const passwordHash = await hashPassword(password);
    await db.insert(passwordCredentials).values({
      userId,
      passwordHash,
    });

    // Add to default organization (for demo)
    const orgs = await db.select().from(organizations).limit(1);
    if (orgs.length > 0) {
      const membershipId = uuidv4();
      await db.insert(organizationMemberships).values({
        id: membershipId,
        userId,
        organizationId: orgs[0].id,
      });

      // Assign default role (if exists)
      const roleList = await db.select().from(roles).where(eq(roles.organizationId, orgs[0].id)).limit(1);
      if (roleList.length > 0) {
        await db.insert(roleAssignments).values({
          membershipId,
          roleId: roleList[0].id,
        });
      }
    }

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
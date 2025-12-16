import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { revokeAllUserSessions, getUserActiveSessions } from '@/lib/auth/session-manager';

/**
 * GET - Get all active sessions for a user
 * POST - Kick user from all devices (revoke all sessions)
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin
    if (!session.permissions?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await params;
    const activeSessions = await getUserActiveSessions(userId);

    return NextResponse.json({
      userId,
      sessionCount: activeSessions.length,
      sessions: activeSessions,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin
    if (!session.permissions?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reason } = await request.json();
    const { userId } = await params;

    await revokeAllUserSessions(
      userId,
      session.userId,
      reason || 'admin_kick'
    );

    return NextResponse.json({
      success: true,
      message: `All sessions revoked for user ${userId}`,
    });
  } catch (error) {
    console.error('Kick user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

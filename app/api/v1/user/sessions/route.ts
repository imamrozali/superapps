import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getUserActiveSessions, revokeSession } from '@/lib/auth/session-manager';

/**
 * GET - Get current user's active sessions
 * DELETE - Revoke a specific session
 */

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeSessions = await getUserActiveSessions(session.userId);

    return NextResponse.json({
      sessionCount: activeSessions.length,
      sessions: activeSessions,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    await revokeSession(sessionId, session.userId, 'user_logout');

    return NextResponse.json({
      success: true,
      message: 'Session revoked',
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { db } from '../db';
import { sessions, sessionRevocations } from '../db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Session management utilities with refresh token support
 */

export interface SessionData {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

// Hash tokens before storing
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Generate random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Create a new session with refresh token
 */
export async function createSessionWithRefresh(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ sessionToken: string; refreshToken: string }> {
  const sessionToken = generateToken();
  const refreshToken = generateToken();
  
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(sessions).values({
    userId,
    token: hashToken(sessionToken),
    refreshToken: hashToken(refreshToken),
    userAgent,
    ipAddress,
    expiresAt,
    refreshExpiresAt,
  });

  return { sessionToken, refreshToken };
}

/**
 * Validate session and return user data
 */
export async function validateSession(sessionToken: string) {
  const hashedToken = hashToken(sessionToken);
  const now = new Date();

  const result = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.token, hashedToken),
        gt(sessions.expiresAt, now),
        isNull(sessions.revokedAt)
      )
    )
    .limit(1);

  if (!result.length) return null;

  // Update last activity
  await db
    .update(sessions)
    .set({ lastActivityAt: now })
    .where(eq(sessions.id, result[0].id));

  return result[0];
}

/**
 * Refresh session using refresh token
 */
export async function refreshSession(refreshToken: string): Promise<{ sessionToken: string } | null> {
  const hashedRefreshToken = hashToken(refreshToken);
  const now = new Date();

  const result = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.refreshToken, hashedRefreshToken),
        gt(sessions.refreshExpiresAt, now),
        isNull(sessions.revokedAt)
      )
    )
    .limit(1);

  if (!result.length) return null;

  // Generate new session token
  const newSessionToken = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db
    .update(sessions)
    .set({
      token: hashToken(newSessionToken),
      expiresAt,
      lastActivityAt: now,
    })
    .where(eq(sessions.id, result[0].id));

  return { sessionToken: newSessionToken };
}

/**
 * Revoke a specific session (kick user from specific device)
 */
export async function revokeSession(
  sessionId: string,
  revokedBy?: string,
  reason: string = 'manual_logout'
) {
  const now = new Date();

  await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(eq(sessions.id, sessionId));

  await db.insert(sessionRevocations).values({
    sessionId,
    revokedBy: revokedBy || null,
    reason,
  });
}

/**
 * Revoke all sessions for a user (kick user from all devices)
 */
export async function revokeAllUserSessions(
  userId: string,
  revokedBy?: string,
  reason: string = 'admin_kick'
) {
  const now = new Date();

  // Get all active sessions
  const userSessions = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt)
      )
    );

  // Revoke all sessions
  await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt)
      )
    );

  // Create revocation records
  for (const session of userSessions) {
    await db.insert(sessionRevocations).values({
      sessionId: session.id,
      revokedBy: revokedBy || null,
      reason,
    });
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserActiveSessions(userId: string) {
  const now = new Date();

  return await db
    .select({
      id: sessions.id,
      userAgent: sessions.userAgent,
      ipAddress: sessions.ipAddress,
      createdAt: sessions.createdAt,
      lastActivityAt: sessions.lastActivityAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        gt(sessions.expiresAt, now),
        isNull(sessions.revokedAt)
      )
    )
    .orderBy(sessions.lastActivityAt);
}

/**
 * Clean up expired sessions (run this periodically)
 */
export async function cleanupExpiredSessions() {
  const now = new Date();

  const expiredSessions = await db
    .select()
    .from(sessions)
    .where(
      and(
        gt(sessions.refreshExpiresAt, now),
        isNull(sessions.revokedAt)
      )
    );

  // Mark as revoked
  for (const session of expiredSessions) {
    await revokeSession(session.id, undefined, 'expired');
  }

  return expiredSessions.length;
}

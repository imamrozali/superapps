import argon2 from 'argon2';
import { db } from '../db';
import { users, userIdentifiers, passwordCredentials } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export async function findUserByIdentifier(type: string, value: string) {
  const result = await db
    .select()
    .from(userIdentifiers)
    .where(and(eq(userIdentifiers.type, type), eq(userIdentifiers.value, value)))
    .leftJoin(users, eq(userIdentifiers.userId, users.id))
    .limit(1);

  if (!result.length) return null;

  const { user_identifiers: identifier, users: user } = result[0];
  return { identifier, user };
}

export async function getPasswordCredential(userId: string) {
  const result = await db
    .select()
    .from(passwordCredentials)
    .where(eq(passwordCredentials.userId, userId))
    .limit(1);

  return result[0] || null;
}
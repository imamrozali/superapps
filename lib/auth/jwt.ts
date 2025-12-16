import jwt from 'jsonwebtoken';

export interface TokenPayload {
  sub: string; // user_id
  org?: string; // organization_id
  unit?: string; // organization_unit_id
  roles: string[]; // role_ids
  permissions: string[]; // permission_codes
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET!;

export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const verified = jwt.verify(token, JWT_SECRET) as TokenPayload;
    console.log(verified, 'jwt.verify(token, JWT_SECRET)');
    return verified;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}
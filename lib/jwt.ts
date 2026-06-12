// JWT utilities using jose (Edge-compatible)
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || '48b4c6bfd33d1b4b2becf6956a86deb5';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

console.log('[JWT] JWT_SECRET loaded:', JWT_SECRET ? 'YES' : 'NO');
console.log('[JWT] JWT_EXPIRES_IN:', JWT_EXPIRES_IN);

const secret = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Sign a JWT token for a user.
 */
export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret);
}

/**
 * Verify and decode a JWT token.
 * Returns null if the token is invalid or expired.
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Extract JWT token from the Authorization header only.
 */
export function extractToken(headers: Headers): string | null {
  const authHeader = headers.get('authorization');
  console.log('[JWT] extractToken - authHeader:', authHeader ? authHeader.substring(0, 30) + '...' : 'NONE');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    console.log('[JWT] extractToken - token extracted:', token.substring(0, 30) + '...');
    return token;
  }
  console.log('[JWT] extractToken - no Bearer token found');
  return null;
}

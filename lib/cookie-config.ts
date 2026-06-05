/**
 * Cookie Configuration - adapts to environment (localhost vs production)
 */

export interface CookieOptions {
  path: string;
  secure: boolean;
  sameSite: 'lax' | 'none';
  maxAge?: number;
  httpOnly?: boolean;
}

/**
 * Get cookie config based on current environment
 * - Localhost: sameSite=lax, secure=false
 * - Production (Vercel): sameSite=none, secure=true (allows cross-site requests)
 */
export function getCookieConfig(maxAge?: number): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    path: '/',
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction ? true : false,
    httpOnly: true,
    maxAge: maxAge || 3 * 24 * 60 * 60,
  };
}

/**
 * Merge custom cookie options with environment defaults
 * Used in middleware/proxy when Supabase refreshes and updates auth tokens
 */
export function mergeCookieConfig(
  customOptions?: Partial<CookieOptions>,
  maxAge?: number
): CookieOptions {
  const baseConfig = getCookieConfig(maxAge);
  return {
    ...baseConfig,
    ...customOptions,
    path: customOptions?.path ?? baseConfig.path, // path should not be overridden
  };
}

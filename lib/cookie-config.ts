/**
 * Cookie Configuration - adapts to environment (localhost vs production)
 */

export interface CookieOptions {
  path: string;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge?: number;
  httpOnly?: boolean;
}

/**
 * Get cookie config based on current environment
 * - Localhost: sameSite=lax, secure=false
 * - Production (Vercel): sameSite=none, secure=true (allows cross-site requests)
 */
export function getCookieConfig(maxAge?: number): CookieOptions {
  // Detect environment
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocalhost = process.env.NODE_ENV === 'development';

  return {
    path: '/',
    // Production requires 'none' for cross-site requests (requires secure: true)
    // Localhost can use 'lax' which is more restrictive
    sameSite: isProduction ? 'none' : 'lax',
    // Always secure in production; can be false in localhost during development
    secure: isProduction ? true : false,
    // Persist for 3 days if maxAge not specified
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

// Admin/Service role client (server-only, uses secret key)
// Only import this in API routes for admin operations

import { db } from '@/lib/db';

/**
 * Compatibility shim for `createAdminSupabase()`.
 *
 * Many server routes import `createAdminSupabase()` to bypass RLS and call
 * `supabase.from(...)`. To avoid changing dozens of files at once, this shim
 * forwards `.from()` calls to the shared `db` client. Any direct `auth.admin`
 * methods are intentionally stubbed and will throw with a helpful message —
 * please migrate routes that call `auth.admin.*` to DB-only flows or to
 * explicit handlers.
 */
export const createAdminSupabase = () => {
  return {
    from: (table: string) => db.from(table),
    rpc: (fn: string, args?: any) => (db.rpc as any)(fn, args),
    /** stubbed auth.admin helpers — throw to force explicit migration */
    auth: {
      admin: {
        createUser: async () => {
          throw new Error('createUser via admin client is deprecated. Migrate to DB-only user creation or use app/api/auth/register.');
        },
        updateUserById: async () => {
          throw new Error('updateUserById via admin client is deprecated. Migrate to storing hashed passwords in your users table and update there.');
        },
        deleteUser: async () => {
          throw new Error('deleteUser via admin client is deprecated. Migrate to DB-only deletion flows.');
        },
        generateLink: async () => {
          throw new Error('generateLink via admin client is deprecated. Use app/api/auth/forgot-password which implements DB reset tokens.');
        },
      },
    },
  } as any;
};

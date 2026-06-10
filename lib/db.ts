// Database-only Supabase client (no auth features used)
// Use this for all direct DB queries in the new custom-auth system.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
if (!supabaseSecretKey) throw new Error('Missing SUPABASE_SECRET_KEY');

/**
 * Server-only admin/service-role DB client.
 * Bypasses RLS — only use in API routes and server-side code.
 */
export const db = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: { 'Prefer': 'return=representation' },
  },
});

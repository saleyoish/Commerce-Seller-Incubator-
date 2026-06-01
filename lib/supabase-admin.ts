// Admin/Service role client (server-only, uses secret key)
// Only import this in API routes for admin operations

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseSecretKey) {
  throw new Error('Missing SUPABASE_SECRET_KEY environment variable');
}

export const createAdminSupabase = () => {
  return createClient(supabaseUrl!, supabaseSecretKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'Prefer': 'return=representation'
      }
    }
  });
};

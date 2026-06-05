// Server-side Supabase client with cookie handling
// Only import this in Server Components and API routes

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getCookieConfig } from '@/lib/cookie-config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabasePublishableKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable');
}

export const createServerSideSupabase = async () => {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';
  
  const cookieConfig = getCookieConfig();

  return createServerClient(supabaseUrl!, supabasePublishableKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...cookieConfig,
              ...options,
              path: cookieConfig.path,
            });
          });
        } catch {
          // setAll() throws when called from a Server Component during rendering.
          // This is expected — the session is still readable via getAll().
        }
      },
    },
    global: {
      headers: {
        'Prefer': 'return=representation'
      }
    }
  });
};

export const createServerSideSupabaseForMiddleware = (request: Request, response: Response) => {
  return createServerClient(supabaseUrl!, supabasePublishableKey!, {
    cookies: {
      get(name: string) {
        const cookie = request.headers.get('cookie');
        if (!cookie) return undefined;
        const match = cookie.match(new RegExp(`${name}=([^;]+)`));
        return match?.[1];
      },
      set(name: string, value: string, options: any) {
        // Cookies will be set by middleware
      },
      remove(name: string, options: any) {
        // Cookies will be removed by middleware
      },
    },
    global: {
      headers: {
        'Prefer': 'return=representation'
      }
    }
  });
};

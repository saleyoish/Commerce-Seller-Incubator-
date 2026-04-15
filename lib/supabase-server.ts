// Server-side Supabase client with cookie handling
// Only import this in Server Components and API routes

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
  
  return createServerClient(supabaseUrl!, supabasePublishableKey!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
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
  });
};

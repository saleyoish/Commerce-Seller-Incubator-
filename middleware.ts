import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        request.cookies.set(name, value);
        response.cookies.set({
          name,
          value,
          ...options,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      },
      remove(name: string, options: any) {
        request.cookies.delete(name);
        response.cookies.set({
          name,
          value: '',
          ...options,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 0,
        });
      },
    },
  });

  // Refresh session if expired
  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

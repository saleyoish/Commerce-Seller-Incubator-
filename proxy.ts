import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export async function proxy(request: NextRequest) {
  // Build the response object first — cookies must be written onto this
  // response for the session refresh to persist across requests.
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Create the Supabase client using the response we control so that
  // setAll() can write the refreshed token cookies back to the browser.
  const isProduction = process.env.NODE_ENV === 'production';
  
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // First write onto the request (for downstream server components)
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        // Rebuild supabaseResponse so the new cookies are included
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, {
            ...options,
            secure: isProduction,
            sameSite: 'lax',
            path: '/',
          });
        });
      },
    },
    global: {
      headers: {
        'Prefer': 'return=representation'
      }
    }
  });

  // IMPORTANT: always call getUser() before any early returns.
  // This is what triggers the silent token refresh and writes the new
  // cookie. Returning early before this call means stale tokens never
  // get refreshed and getUser() will return null in Server Components.
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  
  // Debug logging for seller/admin routes
  const isSellerOrAdmin = pathname.startsWith('/seller') || pathname.startsWith('/admin');
  if (isSellerOrAdmin) {
    const cookies = request.cookies.getAll();
    console.log(`[PROXY] Path: ${pathname}`);
    console.log(`[PROXY] User: ${user?.id || 'null'}`);
    console.log(`[PROXY] Error: ${userError?.message || 'none'}`);
    console.log(`[PROXY] Cookies count: ${cookies.length}`);
    cookies.forEach(c => {
      if (c.name.includes('sb-')) {
        console.log(`[PROXY] Cookie: ${c.name.substring(0, 20)}...`);
      }
    });
  }

  // Public paths — no auth required, but token refresh above already ran
  const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/waitlist-success'];
  const isPublicRoute =
    publicPaths.includes(pathname) ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/email') ||
    pathname.startsWith('/api/waitlist') ||
    pathname.startsWith('/api/waitlist-signup') ||
    pathname.startsWith('/live/') ||
    pathname.startsWith('/ref/') ||
    pathname.startsWith('/apply') ||
    pathname.startsWith('/leaderboard') ||
    pathname.startsWith('/training');

  if (isPublicRoute) {
    // Return supabaseResponse (not NextResponse.next()) so refreshed
    // cookies set above are included in the response.
    return supabaseResponse;
  }

  const isSellerRoute = pathname.startsWith('/seller') || pathname.startsWith('/dashboard');
  const isAdminRoute = pathname.startsWith('/admin');

  // Redirect unauthenticated users to login
  if ((isSellerRoute || isAdminRoute) && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // For admin routes, verify the user has an admin row
  if (isAdminRoute && user) {
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!admin) {
      return NextResponse.redirect(new URL('/seller', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

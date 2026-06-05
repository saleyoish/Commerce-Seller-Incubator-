import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        // Rebuild response with updated cookies
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, {
            ...options,
            path: '/',
            sameSite: 'lax',
            secure: true,
            maxAge: options?.maxAge,
          });
        });
      },
    },
  });

  // Get user - this triggers token refresh
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Debug logging
  if (pathname.startsWith('/seller') || pathname.startsWith('/admin')) {
    console.log(`[AUTH-PROXY] ${pathname} | User: ${user?.id || 'NONE'} | Error: ${userError?.message || 'OK'}`);
  }

  // Public paths
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/waitlist-success',
  ];

  const isPublicRoute =
    publicPaths.includes(pathname) ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/email') ||
    pathname.startsWith('/api/waitlist') ||
    pathname.startsWith('/api/waitlist-signup') ||
    pathname.startsWith('/live/') ||
    pathname.startsWith('/ref/') ||
    pathname.startsWith('/leaderboard') ||
    pathname.startsWith('/training');

  if (isPublicRoute) {
    return supabaseResponse;
  }

  const isSellerRoute = pathname.startsWith('/seller') || pathname.startsWith('/dashboard');
  const isAdminRoute = pathname.startsWith('/admin');

  // Protected routes - require authentication
  if ((isSellerRoute || isAdminRoute) && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes - verify admin status
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

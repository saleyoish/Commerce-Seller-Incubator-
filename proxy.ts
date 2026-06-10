import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { getCookieConfig } from '@/lib/cookie-config';
import { verifyJWT, extractToken } from '@/lib/jwt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

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
        const cookieConfig = getCookieConfig();
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, {
            ...options,
            path: cookieConfig.path,
            sameSite: cookieConfig.sameSite,
            secure: cookieConfig.secure,
            maxAge: options?.maxAge ?? cookieConfig.maxAge,
          });
        });
      },
    },
  });

  // Try JWT first (custom auth). If no valid JWT, fall back to Supabase auth session.
  let user: any = null;
  let userError: any = null;

  try {
    const token = extractToken(request.headers);
    if (token) {
      const payload = await verifyJWT(token);
      if (payload) {
        user = { id: payload.userId, email: payload.email };
      }
    }
  } catch (e) {
    console.error('[PROXY] JWT verify error:', e);
  }

  // If no JWT user, try Supabase session (legacy / compatibility)
  if (!user) {
    try {
      const result = await supabase.auth.getUser();
      user = result?.data?.user ?? null;
      userError = result?.error ?? null;
    } catch (e) {
      userError = e;
    }
  }

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
    console.log('[PROXY] Verifying admin status for user:', user.id);
    
    // Use service role client for admin verification (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // Try by id first (custom auth), then by user_id (Supabase auth)
    const { data: admin, error: adminError } = await adminClient
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    console.log('[PROXY] Admin check by id:', admin ? 'FOUND' : 'NOT FOUND', 'Error:', adminError);

    if (!admin) {
      // Fallback to user_id check for Supabase auth compatibility
      const { data: adminByUserId, error: userIdError } = await adminClient
        .from('admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('[PROXY] Admin check by user_id:', adminByUserId ? 'FOUND' : 'NOT FOUND', 'Error:', userIdError);
      
      if (!adminByUserId) {
        console.log('[PROXY] Admin verification failed for user:', user.id);
        return NextResponse.redirect(new URL('/seller', request.url));
      }
    }
    
    console.log('[PROXY] Admin verification successful');
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

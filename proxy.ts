import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export async function proxy(request: NextRequest) {
  // Create response to modify cookies
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookieOptions: {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Get authenticated user (secure, validates with Supabase Auth server)
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // Protected routes
  const sellerRoutes = ['/dashboard', '/dashboard/products'];
  const adminRoutes = ['/admin', '/admin/sellers', '/admin/products', '/admin/sales', '/admin/payouts'];
  const isSellerRoute = sellerRoutes.some(route => request.nextUrl.pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  // Redirect to signup if not authenticated on protected routes
  if ((isSellerRoute || isAdminRoute) && (!user || userError)) {
    return NextResponse.redirect(new URL('/signup', request.url));
  }

  // Check admin access for admin routes
  if (isAdminRoute && user) {
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Check seller approval for dashboard access
  if (isSellerRoute && user && !isAdminRoute) {
    const { data: seller } = await supabase
      .from('sellers')
      .select('approval_status')
      .eq('user_id', user.id)
      .single();

    // Allow access to dashboard even if pending, but we can show a notice
    // Only redirect if not a seller at all (no record)
    if (!seller && !isAdminRoute) {
      // Allow signup flow to complete first
      if (request.nextUrl.pathname !== '/signup') {
        return NextResponse.redirect(new URL('/signup', request.url));
      }
    }
  }

  return response;
}

// Proxy configuration for Next.js 16+
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

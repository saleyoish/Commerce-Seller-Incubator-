// API route to check if current user is seller or admin
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing Supabase environment variables');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Create Supabase client for API route with proper cookie handling
    const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Cookies are read-only in API routes
        },
      },
      global: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      }
    });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

  console.log(`[CHECK-USER-API] User: ${user?.id || 'NONE'} | Token Error: ${authError?.message || 'OK'}`);

  if (authError) {
    console.error(`[CHECK-USER-API] Auth error:`, authError);
  }

  if (!user) {
      );
    }

    // Use regular client with user's auth to query (RLS will apply)
    // Check if user is seller
    const { data: sellerData, error: sellerError } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Check if user is admin
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    // Log any errors for debugging
    if (sellerError) console.error('Seller query error:', sellerError);
    if (adminError) console.error('Admin query error:', adminError);

    return NextResponse.json({
      isSeller: !!sellerData,
      isAdmin: !!adminData,
      seller: sellerData,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error('Error checking user status:', error);
    return NextResponse.json(
      { error: 'Internal server error', isSeller: false, isAdmin: false, user: null },
      { status: 500 }
    );
  }
}

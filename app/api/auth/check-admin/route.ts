// API route to check if current user is admin
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminSupabase } from '@/lib/supabase-admin';

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
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', isAdmin: false },
        { status: 401 }
      );
    }

    // Use admin client (service role) to bypass RLS
    const adminSupabase = createAdminSupabase();
    
    // Check if user is admin
    const { data: adminData } = await adminSupabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({ isAdmin: !!adminData });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { error: 'Internal server error', isAdmin: false },
      { status: 500 }
    );
  }
}

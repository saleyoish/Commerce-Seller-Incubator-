// API route to check if current user is seller or admin
import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Use regular client to check auth
    const supabase = await createServerSideSupabase();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', isSeller: false, isAdmin: false, user: null },
        { status: 401 }
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

// API route to check if current user is admin
import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { createAdminSupabase } from '@/lib/supabase-admin';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Use regular client to check auth
    const supabase = await createServerSideSupabase();
    
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

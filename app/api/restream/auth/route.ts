import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.redirect(new URL('/login?redirect=/seller/restream-setup', request.url));
    }

    // Redirect to Restream setup page which will show the configuration form
    // The setup page handles both new setups and already connected users
    return NextResponse.redirect(new URL('/seller/restream-setup?connect=true', request.url));

  } catch (error: any) {
    console.error('Restream auth error:', error);
    return NextResponse.redirect(new URL('/seller/restream-setup?error=auth_failed', request.url));
  }
}

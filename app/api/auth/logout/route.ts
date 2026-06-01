import { createClientSideSupabase } from '@/lib/supabase-client';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = createClientSideSupabase();
    
    // Sign out the user
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error);
      return NextResponse.json(
        { error: 'Failed to logout' },
        { status: 500 }
      );
    }

    // Return success response and redirect to login
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/login?loggedOut=true`
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

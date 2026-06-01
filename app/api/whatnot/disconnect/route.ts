import { createServerSideSupabase } from '@/lib/supabase-server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Use server-side supabase to identify the user, then perform the update
    // with the admin (service role) client so RLS won't block the update.
    const serverSupabase = await createServerSideSupabase();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: seller } = await serverSupabase
      .from('sellers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    const admin = createAdminSupabase();

    const { data: connection, error: connectionError } = await admin
      .from('platform_connections')
      .select('*')
      .eq('seller_id', seller.id)
      .eq('platform', 'whatnot')
      .maybeSingle();

    if (connectionError) {
      console.error('Whatnot connection lookup error:', connectionError);
    }

    if (connection) {
      const { error: connectionUpdateError } = await admin
        .from('platform_connections')
        .update({
          status: 'disconnected',
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
          metadata: {
            ...connection.metadata,
            disconnectedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id);

      if (connectionUpdateError) {
        console.error('Whatnot disconnect connection update error:', connectionUpdateError);
        return NextResponse.json({ error: 'Failed to update connection record' }, { status: 500 });
      }
    }

    const { error, data } = await admin
      .from('sellers')
      .update({
        whatnot_seller_status: 'not_registered',
        whatnot_username: null,
        whatnot_display_name: null,
        whatnot_email: null,
        whatnot_phone: null,
        whatnot_business_address: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', seller.id)
      .select();

    if (error) {
      console.error('Disconnect update error:', error);
      return NextResponse.json({ error: 'Failed to disconnect Whatnot' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Seller connection not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Whatnot disconnect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

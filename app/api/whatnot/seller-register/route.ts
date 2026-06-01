import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';

// POST - Register seller as Whatnot seller
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { displayName, email, phone, businessAddress, accessToken } = await request.json();

    // Validate required fields
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    // Get seller record
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    // Update seller with Whatnot registration info if provided
    const sellerUpdatePayload: any = {
      whatnot_seller_status: 'pending',
      updated_at: new Date().toISOString(),
    };

    if (displayName) sellerUpdatePayload.whatnot_display_name = displayName;
    if (email) sellerUpdatePayload.whatnot_email = email;
    if (phone) sellerUpdatePayload.whatnot_phone = phone;
    if (businessAddress) sellerUpdatePayload.whatnot_business_address = businessAddress;

    const { error: updateError } = await supabase
      .from('sellers')
      .update(sellerUpdatePayload)
      .eq('id', seller.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Create or update a Whatnot platform connection for this seller
    const normalizedAccessToken = accessToken?.trim();
    
    console.log('[Whatnot Register] Normalized token length:', normalizedAccessToken?.length);
    console.log('[Whatnot Register] Token first 10 chars:', normalizedAccessToken?.substring(0, 10) + '...');
    
    const connectionPayload = {
      seller_id: seller.id,
      platform: 'whatnot',
      status: 'connected',
      platform_username: null,
      platform_user_id: null,
      platform_category: null,
      platform_bio: null,
      access_token: normalizedAccessToken,
      refresh_token: null,
      token_expires_at: null,
      metadata: {
        displayName,
        email,
        phone,
        businessAddress,
        access_token: normalizedAccessToken,
      },
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: existingConnection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('seller_id', seller.id)
      .eq('platform', 'whatnot')
      .maybeSingle();

    if (connectionError) {
      console.warn('Whatnot connection lookup failed:', connectionError.message || connectionError);
    }

    if (existingConnection) {
      const { error: updateError } = await supabase
        .from('platform_connections')
        .update(connectionPayload)
        .eq('id', existingConnection.id);
      
      if (updateError) {
        console.error('[Whatnot Register] Connection update error:', updateError);
      } else {
        console.log('[Whatnot Register] Connection updated successfully');
      }
    } else {
      const { error: insertError } = await supabase
        .from('platform_connections')
        .insert(connectionPayload);
        
      if (insertError) {
        console.error('[Whatnot Register] Connection insert error:', insertError);
      } else {
        console.log('[Whatnot Register] Connection created successfully');
      }
    }

    // Trigger a demo product sync for the connected seller
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/whatnot/sync-products?sellerId=${seller.id}&syncType=pull`, {
        method: 'POST',
      });
    } catch (syncError) {
      console.error('Whatnot demo sync failed:', syncError);
    }

    // In production, this would call Whatnot's seller registration API
    // For now, we'll simulate the registration
    
    return NextResponse.json({
      success: true,
      message: 'Whatnot seller registration submitted successfully',
      sellerId: `WN-${seller.id.slice(0, 8).toUpperCase()}`,
    });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Whatnot seller registration error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Check Whatnot seller registration status
export async function GET() {
  try {
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('whatnot_seller_status, whatnot_display_name, whatnot_email')
      .eq('user_id', user.id)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: seller.whatnot_seller_status || 'not_registered',
      displayName: seller.whatnot_display_name,
      email: seller.whatnot_email,
    });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Whatnot seller status check error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

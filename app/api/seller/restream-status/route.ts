import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get seller data by user_id first; fallback to email if no match exists
    let sellers = null;
    let sellerError = null;

    const { data: sellersById, error: sellersByIdError } = await supabase
      .from('sellers')
      .select('id, user_id, email, restream_stream_key, restream_username, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    sellers = sellersById;
    sellerError = sellersByIdError;
    console.log('sellers', sellers);
    console.log('user.id', user.id);

    // If no sellers by user_id, or if the sellers don't have keys, try email
    if ((!sellers || sellers.length === 0 || !sellers.some(s => s.restream_stream_key && s.restream_stream_key !== 'NOT_CONFIGURED')) && user.email) {
      const { data: sellersByEmail, error: sellersByEmailError } = await supabase
        .from('sellers')
        .select('id, user_id, email, restream_stream_key, restream_username')
        .eq('email', user.email)
        .order('created_at', { ascending: false });

      if (sellersByEmail && sellersByEmail.length > 0) {
        // Use email sellers if they have keys, otherwise keep user_id sellers
        if (sellersByEmail.some(s => s.restream_stream_key && s.restream_stream_key !== 'NOT_CONFIGURED')) {
          sellers = sellersByEmail;
          sellerError = sellersByEmailError;
        }
      }
    }

    if (sellerError) {
      console.error('Seller lookup error:', sellerError);
      return NextResponse.json({
        connected: false,
        obsConfigured: false,
        lastObsPath: '',
        streamKey: null,
        needsSellerSetup: true,
        message: 'Error checking seller data'
      });
    }

    // Find seller with valid stream key first, otherwise use most recent
    let seller = null;
    if (sellers && sellers.length > 0) {
      // First, look for a seller with a valid stream key
      seller = sellers.find(s => s.restream_stream_key && 
                               s.restream_stream_key !== 'NOT_CONFIGURED' && 
                               s.restream_stream_key.length > 10);
      
      // If no seller has a valid stream key, use the most recent seller
      if (!seller) {
        seller = sellers[0];
      }
    }

    // If no seller record exists, try to auto-create one
    if (!seller) {
      console.log('No seller record found for user:', user.id, '- attempting auto-creation');
      
      // Try to create a seller record automatically
      try {
        const { data: newSellers, error: createError } = await supabase
          .from('sellers')
          .insert({
            user_id: user.id,
            email: user.email || '',
            phone: '',
            stripe_onboarding_status: 'pending',
            approval_status: 'pending',
            restream_stream_key: 'NOT_CONFIGURED'
          })
          .select();
        
        const newSeller = newSellers && newSellers.length > 0 ? newSellers[0] : null;
        
        if (createError) {
          console.error('Failed to auto-create seller:', createError);
          return NextResponse.json({
            connected: false,
            obsConfigured: false,
            lastObsPath: '',
            streamKey: null,
            needsSellerSetup: true,
            message: 'Please complete seller registration in your dashboard before streaming'
          });
        }
        
        // Return the newly created seller (not connected yet)
        return NextResponse.json({
          connected: false,
          obsConfigured: false,
          lastObsPath: '',
          streamKey: 'NOT_CONFIGURED',
          sellerId: newSeller.id,
          message: 'Seller account created. Please connect Restream to start streaming.'
        });
        
      } catch (createErr) {
        console.error('Error auto-creating seller:', createErr);
        return NextResponse.json({
          connected: false,
          obsConfigured: false,
          lastObsPath: '',
          streamKey: null,
          needsSellerSetup: true,
          message: 'Please complete seller registration in your dashboard before streaming'
        });
      }
    }

    // Check if Restream is configured - be flexible: stream key is the main indicator
    console.log('Seller data:', seller);
    console.log('Stream key from DB:', seller.restream_stream_key);
    const hasValidStreamKey = seller.restream_stream_key && 
                               seller.restream_stream_key !== 'NOT_CONFIGURED' && 
                               seller.restream_stream_key.length > 10;
    console.log('hasValidStreamKey calculated:', hasValidStreamKey);
    
    // Also check if username exists (for consistency with settings page)
    const hasUsername = !!seller.restream_username;
    
    // Consider connected if we have a valid stream key (username is bonus)
    const restreamConnected = hasValidStreamKey;
    
    // If connected but missing username, auto-add a default one
    if (restreamConnected && !hasUsername) {
      try {
        await supabase
          .from('sellers')
          .update({ restream_username: user.email?.split('@')[0] || 'restream_user' })
          .eq('user_id', user.id);
      } catch (e) {
        console.log('Could not auto-add username, but continuing');
      }
    }
    
    // Check if OBS has been configured before
    const obsConfigured = false; // Default since metadata column doesn't exist
    const lastObsPath = ''; // Default since metadata column doesn't exist

    return NextResponse.json({
      connected: restreamConnected,
      obsConfigured: obsConfigured,
      lastObsPath: lastObsPath,
      streamKey: seller.restream_stream_key,
      hasUsername: hasUsername || restreamConnected // Return true if we just added it
    });

  } catch (error: any) {
    console.error('Restream status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check Restream status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { obsConfigured, obsPath } = await request.json();

    // Update seller metadata
    const { data: seller, error: updateError } = await supabase
      .from('sellers')
      .update({
        metadata: {
          obs_configured: obsConfigured,
          last_obs_path: obsPath,
          updated_at: new Date().toISOString()
        }
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update OBS configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      obsConfigured: obsConfigured,
      message: 'OBS configuration saved'
    });

  } catch (error: any) {
    console.error('OBS configuration save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save OBS configuration' },
      { status: 500 }
    );
  }
}

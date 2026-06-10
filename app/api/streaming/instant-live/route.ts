import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { restreamAPI } from '@/lib/restream';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerSideSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get seller data by user_id first; fallback to email if needed
    let sellers = null;
    const { data: sellersById } = await supabase
      .from('sellers')
      .select('*, restream_username, restream_stream_key')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    sellers = sellersById;

    if ((!sellers || sellers.length === 0) && user.email) {
      const { data: sellersByEmail } = await supabase
        .from('sellers')
        .select('*, restream_username, restream_stream_key')
        .eq('email', user.email)
        .order('created_at', { ascending: false });
      sellers = sellersByEmail;
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

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found. Please complete seller registration first.' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { action, platforms, title, selectedProducts, streamKey } = body;

    // Handle stop stream action
    if (action === 'stop_stream') {
      // Find active stream session for this seller
      const { data: activeSession, error: sessionError } = await supabase
        .from('stream_sessions')
        .select('*')
        .eq('seller_id', seller.id)
        .in('status', ['pending', 'live'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (sessionError || !activeSession) {
        return NextResponse.json({ error: 'No active stream found' }, { status: 404 });
      }

      // Stop Restream event if it exists
      if (activeSession.restream_event_id) {
        try {
          await restreamAPI.endEvent(activeSession.restream_event_id);
        } catch (e) {
          console.log('Could not stop Restream event, but continuing');
        }
      }

      // Update stream session status
      const { data: updatedSession, error: updateError } = await supabase
        .from('stream_sessions')
        .update({
          status: 'ended',
          actual_end: new Date().toISOString()
        })
        .eq('id', activeSession.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update stream session:', updateError);
        return NextResponse.json({ error: 'Failed to stop stream' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Stream stopped successfully',
        streamSession: updatedSession
      });
    }

    // For start stream action, validate platforms
    if (!platforms || platforms.length === 0) {
      return NextResponse.json({ error: 'At least one platform required' }, { status: 400 });
    }

    // Create instant stream session with PENDING status
    const { data: streamSession, error: streamError } = await supabase
      .from('stream_sessions')
      .insert({
        seller_id: seller.id,
        title: title || 'Instant Live Stream',
        description: 'Instant multi-platform live stream',
        scheduled_start: new Date().toISOString(),
        actual_start: null, // Will be set when webhook fires
        status: 'pending', // Changed from 'live' to 'pending'
        platforms: platforms,
        products_featured: selectedProducts || [],
        metadata: {
          instant: true,
          obs_config: {
            server: 'rtmp://live.restream.io/live',
            stream_key: seller.restream_stream_key || 'NOT_CONFIGURED'
          }
        }
      })
      .select('id, seller_id, title, description, status, platforms, products_featured, scheduled_start, actual_start, actual_end, restream_event_id, metadata, created_at, updated_at')
      .single();

    if (streamError) throw streamError;

    // Note: We no longer manually start Restream events
    // OBS RTMP streaming will automatically trigger the live state
    // Webhook will handle status updates when stream actually starts

    return NextResponse.json({
      success: true,
      streamSession,
      obsConfig: {
        server: 'rtmp://live.restream.io/live',
        streamKey: seller.restream_stream_key || 'NOT_CONFIGURED'
      },
      platforms: platforms,
      warning: !seller.restream_stream_key ? 'Restream not configured. Please setup Restream first.' : null
    });

  } catch (error: any) {
    console.error('Instant live error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start instant stream' },
      { status: 500 }
    );
  }
}


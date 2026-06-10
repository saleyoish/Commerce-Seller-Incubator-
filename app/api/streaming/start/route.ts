// API route to start a stream (mark as live)
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

    // Get seller data with Restream credentials - handle duplicates and email fallback
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

    const seller = sellers && sellers.length > 0 ? sellers[0] : null;

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found. Please complete seller registration first.' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { streamId } = body;

    if (!streamId) {
      return NextResponse.json({ error: 'Stream ID required' }, { status: 400 });
    }

    // Get stream session
    const { data: streamSession } = await supabase
      .from('stream_sessions')
      .select('*')
      .eq('id', streamId)
      .eq('seller_id', seller.id)
      .single();

    if (!streamSession) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    // Start on Restream if event exists
    if (streamSession.restream_event_id) {
      await restreamAPI.startEvent(streamSession.restream_event_id);
    }

    // Get saved stream key
    const savedStreamKey = seller?.restream_stream_key;
    
    // Update database with stream key in metadata
    const { data: updated, error: dbError } = await supabase
      .from('stream_sessions')
      .update({
        status: 'live',
        actual_start: new Date().toISOString(),
        metadata: {
          ...streamSession.metadata,
          rtmp_url: 'rtmp://live.restream.io/live',
          stream_key: savedStreamKey || 'NOT_CONFIGURED',
        }
      })
      .eq('id', streamId)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to update stream status' },
        { status: 500 }
      );
    }

    // Return stream configuration for OBS
    if (!savedStreamKey) {
      return NextResponse.json({
        success: true,
        streamSession: updated,
        warning: 'No stream key configured. Go to /dashboard/streaming/setup to add your Restream key.',
        obsConfig: {
          server: 'rtmp://live.restream.io/live',
          streamKey: 'NOT_CONFIGURED',
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      streamSession: updated,
      obsConfig: {
        server: 'rtmp://live.restream.io/live',
        streamKey: savedStreamKey,
      },
    });
  } catch (error: any) {
    console.error('Error starting stream:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

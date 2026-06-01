// API route to end a stream
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

    // Get seller data - handle duplicates
    const { data: sellers } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
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

    // End on Restream if event exists
    if (streamSession.restream_event_id) {
      await restreamAPI.endEvent(streamSession.restream_event_id);
    }

    // Update database
    const { data: updated, error: dbError } = await supabase
      .from('stream_sessions')
      .update({
        status: 'ended',
        actual_end: new Date().toISOString(),
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

    return NextResponse.json({
      success: true,
      streamSession: updated,
    });
  } catch (error: any) {
    console.error('Error ending stream:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

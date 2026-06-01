// API route to create a new streaming event on Restream
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
    const { title, description, scheduledStart, platforms } = body;

    if (!title || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Title and at least one platform required' },
        { status: 400 }
      );
    }

    // Create event on Restream
    const event = await restreamAPI.createEvent({
      title,
      description,
      scheduledAt: scheduledStart,
      platforms,
    });

    // Save to database
    const { data: streamSession, error: dbError } = await supabase
      .from('stream_sessions')
      .insert({
        seller_id: seller.id,
        title,
        description,
        scheduled_start: scheduledStart,
        status: 'scheduled',
        platforms,
        restream_event_id: event.id,
        metadata: {
          rtmp_url: event.rtmpsUrl,
          stream_key: event.streamKey,
          destinations: event.destinations,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save stream session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      streamSession,
      streamConfig: {
        rtmpUrl: event.rtmpsUrl,
        streamKey: event.streamKey,
      },
    });
  } catch (error: any) {
    console.error('Error creating streaming event:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

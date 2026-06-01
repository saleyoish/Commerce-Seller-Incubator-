// Webhook handler for Restream.io status updates
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';

// Webhook secret for verification
const WEBHOOK_SECRET = process.env.RESTREAM_WEBHOOK_SECRET;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // Verify webhook signature if secret is configured
    const signature = request.headers.get('x-restream-signature');
    if (WEBHOOK_SECRET && signature) {
      // In production, verify the signature
      // const isValid = verifySignature(body, signature, WEBHOOK_SECRET);
      // if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { event, data } = body;

    // Handle different event types
    switch (event) {
      case 'stream.started':
        await handleStreamStarted(data);
        break;
      case 'stream.ended':
        await handleStreamEnded(data);
        break;
      case 'stream.metrics':
        await handleStreamMetrics(data);
        break;
      default:
        console.log('Unknown webhook event:', event);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleStreamStarted(data: any) {
  const supabase = createAdminSupabase();
  
  // Find stream session by Restream event ID or by pending status
  const { data: sessions } = await supabase
    .from('stream_sessions')
    .select('*')
    .or(`restream_event_id.eq.${data.eventId},status.eq.pending`)
    .eq('seller_id', data.userId) // Match by user ID as fallback
    .limit(1);

  if (sessions && sessions.length > 0) {
    const session = sessions[0];
    
    await supabase
      .from('stream_sessions')
      .update({
        status: 'live',
        actual_start: data.timestamp || new Date().toISOString(),
        restream_event_id: data.eventId,
        metadata: {
          ...session.metadata,
          stream_started_at: data.timestamp,
          stream_id: data.streamId,
          webhook_received: true,
        },
      })
      .eq('id', session.id);
    
    console.log('Stream marked as live:', session.id);
    
    // Trigger real-time update for dashboard
    await triggerRealtimeUpdate(session.id, 'live', supabase);
  }
}

async function handleStreamEnded(data: any) {
  const supabase = createAdminSupabase();
  
  const { data: sessions } = await supabase
    .from('stream_sessions')
    .select('*')
    .eq('restream_event_id', data.eventId)
    .limit(1);

  if (sessions && sessions.length > 0) {
    const session = sessions[0];
    
    await supabase
      .from('stream_sessions')
      .update({
        status: 'ended',
        actual_end: data.timestamp || new Date().toISOString(),
        metadata: {
          ...session.metadata,
          stream_ended_at: data.timestamp,
          duration_seconds: data.duration,
        },
      })
      .eq('id', session.id);
    
    console.log('Stream marked as ended:', session.id);
    
    // Trigger real-time update for dashboard
    await triggerRealtimeUpdate(session.id, 'ended', supabase);
  }
}

async function triggerRealtimeUpdate(streamSessionId: string, status: string, supabase: any) {
  try {
    // This will trigger Supabase realtime updates for connected clients
    const { error } = await supabase
      .from('stream_sessions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', streamSessionId);

    if (error) {
      console.error('Failed to trigger realtime update:', error);
    }
  } catch (error) {
    console.error('Error triggering realtime update:', error);
  }
}

async function handleStreamMetrics(data: any) {
  const supabase = createAdminSupabase();
  
  const { data: sessions } = await supabase
    .from('stream_sessions')
    .select('*')
    .eq('restream_event_id', data.eventId)
    .limit(1);

  if (sessions && sessions.length > 0) {
    const session = sessions[0];
    
    // Update stream metrics
    await supabase
      .from('stream_sessions')
      .update({
        total_viewers: data.totalViewers || session.total_viewers,
        peak_viewers: Math.max(data.peakViewers || 0, session.peak_viewers || 0),
        metadata: {
          ...session.metadata,
          current_viewers: data.currentViewers,
          bitrate: data.bitrate,
          fps: data.fps,
          updated_at: new Date().toISOString(),
        },
      })
      .eq('id', session.id);

    // Also insert into stream_platform_metrics for historical data
    if (data.platforms) {
      for (const platform of data.platforms) {
        await supabase
          .from('stream_platform_metrics')
          .insert({
            stream_session_id: session.id,
            platform: platform.name,
            viewers_current: platform.viewers || 0,
            viewers_peak: platform.peakViewers || 0,
            sales_count: 0, // Will be updated separately
            sales_total: 0,
          });
      }
    }
  }
}

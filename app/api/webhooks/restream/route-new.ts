import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { streamingService } from '@/services/streaming.service';
import { validateRestreamWebhook } from '@/lib/validation/streaming-new';
import { WebhookEventType, StreamStatus } from '@/types/streaming';
import { STREAMING_CONSTANTS } from '@/constants/streaming';
import crypto from 'crypto';

// Webhook security verification
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Idempotent webhook processing
async function processWebhookEvent(
  eventType: WebhookEventType,
  data: any,
  signature?: string
): Promise<void> {
  const supabase = createAdminSupabase();
  
  // Log webhook event
  await streamingService.logWebhookEvent(eventType, null, data, false);
  
  try {
    switch (eventType) {
      case WebhookEventType.STREAM_STARTED:
        await handleStreamStarted(data, supabase);
        break;
      
      case WebhookEventType.STREAM_ENDED:
        await handleStreamEnded(data, supabase);
        break;
      
      case WebhookEventType.STREAM_ERROR:
        await handleStreamError(data, supabase);
        break;
      
      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }
  } catch (error) {
    console.error(`Error processing webhook event ${eventType}:`, error);
    
    // Log error for retry processing
    await streamingService.logWebhookEvent(
      eventType,
      null,
      data,
      false,
      error instanceof Error ? error.message : String(error)
    );
    
    throw error;
  }
}

async function handleStreamStarted(data: any, supabase: any): Promise<void> {
  console.log('Processing stream started webhook:', data);
  
  // Find stream session by Restream stream ID or user ID
  const { data: sessions } = await supabase
    .from('stream_sessions')
    .select('*')
    .or(`restream_stream_id.eq.${data.streamId},seller_id.eq.${data.userId}`)
    .in('status', [StreamStatus.PENDING])
    .order('created_at', { ascending: false })
    .limit(1);

  if (!sessions || sessions.length === 0) {
    console.log('No pending stream session found for webhook');
    return;
  }

  const session = sessions[0];
  
  // Update stream session to LIVE status
  const { error: updateError } = await supabase
    .from('stream_sessions')
    .update({
      status: StreamStatus.LIVE,
      actual_start: data.startedAt || new Date().toISOString(),
      restream_stream_id: data.streamId,
      restream_event_id: data.id,
      metadata: {
        ...session.metadata,
        webhook_received: true,
        stream_started_at: data.startedAt,
        current_viewers: data.metrics?.currentViewers || 0,
        peak_viewers: data.metrics?.peakViewers || 0,
        bitrate: data.metrics?.bitrate || 0,
        fps: data.metrics?.fps || 0
      }
    })
    .eq('id', session.id);

  if (updateError) {
    throw new Error(`Failed to update stream session: ${updateError.message}`);
  }

  console.log(`Stream session ${session.id} updated to LIVE status`);

  // Log successful processing
  await streamingService.logWebhookEvent(
    WebhookEventType.STREAM_STARTED,
    session.id,
    data,
    true
  );

  // Trigger real-time update
  await streamingService.updateStreamStatus(session.id, {
    status: StreamStatus.LIVE,
    actual_start: data.startedAt || new Date().toISOString()
  });
}

async function handleStreamEnded(data: any, supabase: any): Promise<void> {
  console.log('Processing stream ended webhook:', data);
  
  // Find the stream session
  const { data: sessions } = await supabase
    .from('stream_sessions')
    .select('*')
    .or(`restream_stream_id.eq.${data.streamId},restream_event_id.eq.${data.id}`)
    .eq('status', StreamStatus.LIVE)
    .limit(1);

  if (!sessions || sessions.length === 0) {
    console.log('No live stream session found for webhook');
    return;
  }

  const session = sessions[0];
  
  // Calculate duration if not provided
  const duration = data.duration || (
    session.actual_start 
      ? Math.floor((new Date().getTime() - new Date(session.actual_start).getTime()) / 1000)
      : 0
  );

  // Update stream session to ENDED status
  const { error: updateError } = await supabase
    .from('stream_sessions')
    .update({
      status: StreamStatus.ENDED,
      actual_end: data.endedAt || new Date().toISOString(),
      ended_at: data.endedAt || new Date().toISOString(),
      metadata: {
        ...session.metadata,
        stream_ended_at: data.endedAt,
        duration_seconds: duration,
        total_viewers: data.metrics?.totalViewers || session.metadata.total_viewers || 0,
        peak_viewers: Math.max(
          data.metrics?.peakViewers || 0, 
          session.metadata.peak_viewers || 0
        )
      }
    })
    .eq('id', session.id);

  if (updateError) {
    throw new Error(`Failed to update stream session: ${updateError.message}`);
  }

  console.log(`Stream session ${session.id} updated to ENDED status`);

  // Log successful processing
  await streamingService.logWebhookEvent(
    WebhookEventType.STREAM_ENDED,
    session.id,
    data,
    true
  );

  // Trigger real-time update
  await streamingService.updateStreamStatus(session.id, {
    status: StreamStatus.ENDED,
    actual_end: data.endedAt || new Date().toISOString(),
    ended_at: data.endedAt || new Date().toISOString()
  });
}

async function handleStreamError(data: any, supabase: any): Promise<void> {
  console.log('Processing stream error webhook:', data);
  
  // Find the stream session
  const { data: sessions } = await supabase
    .from('stream_sessions')
    .select('*')
    .or(`restream_stream_id.eq.${data.streamId},restream_event_id.eq.${data.id}`)
    .in('status', [StreamStatus.PENDING, StreamStatus.LIVE])
    .limit(1);

  if (!sessions || sessions.length === 0) {
    console.log('No active stream session found for error webhook');
    return;
  }

  const session = sessions[0];
  
  // Update stream session to ERROR status
  const { error: updateError } = await supabase
    .from('stream_sessions')
    .update({
      status: StreamStatus.ERROR,
      metadata: {
        ...session.metadata,
        error_details: {
          code: data.errorCode || 'STREAM_ERROR',
          message: data.errorMessage || 'Stream error occurred',
          timestamp: new Date().toISOString()
        }
      }
    })
    .eq('id', session.id);

  if (updateError) {
    throw new Error(`Failed to update stream session: ${updateError.message}`);
  }

  console.log(`Stream session ${session.id} updated to ERROR status`);

  // Log successful processing
  await streamingService.logWebhookEvent(
    WebhookEventType.STREAM_ERROR,
    session.id,
    data,
    true
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    
    // Parse webhook event
    let event;
    try {
      event = validateRestreamWebhook(JSON.parse(body));
    } catch (parseError) {
      console.error('Failed to parse webhook body:', parseError);
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.RESTREAM_WEBHOOK_SECRET;
    const signature = request.headers.get(STREAMING_CONSTANTS.WEBHOOK.SIGNATURE_HEADER);
    
    if (webhookSecret && signature) {
      if (!verifyWebhookSignature(body, signature, webhookSecret)) {
        console.error('Webhook signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else if (webhookSecret && !signature) {
      console.warn('Webhook secret configured but no signature provided');
    }

    // Process the webhook event
    await processWebhookEvent(event.type, event.data, signature || undefined);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Restream webhook error:', error);
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// GET endpoint for webhook health check
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'restream-webhook-handler'
  });
}

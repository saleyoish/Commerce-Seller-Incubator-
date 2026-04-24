// Mux webhook handler for processing video events
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { generateClipsFromRecording } from '@/lib/services/clip-generation';
import crypto from 'crypto';

const MUX_WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET;

// Verify Mux webhook signature
function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!MUX_WEBHOOK_SECRET) {
    console.warn('MUX_WEBHOOK_SECRET not set, skipping signature verification');
    return true;
  }

  const expectedSignature = crypto
    .createHmac('sha256', MUX_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();
    const signature = request.headers.get('mux-signature') || '';

    // Verify signature
    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    const { type, data } = event;

    console.log('Received Mux webhook:', type);

    const supabase = createAdminSupabase();

    switch (type) {
      case 'video.asset.ready': {
        // Asset is ready for playback
        const assetId = data.id;
        const playbackId = data.playback_ids?.[0]?.id;
        const duration = data.duration;

        // Find recording by Mux asset ID
        const { data: recording, error } = await supabase
          .from('stream_recordings')
          .select('*')
          .eq('mux_asset_id', assetId)
          .single();

        if (error || !recording) {
          console.log('No recording found for asset:', assetId);
          break;
        }

        // Update recording
        await supabase
          .from('stream_recordings')
          .update({
            download_status: 'completed',
            processing_status: 'ready',
            duration: Math.round(duration),
            resolution: data.max_stored_resolution,
            mux_playback_id: playbackId,
          })
          .eq('id', recording.id);

        // Trigger clip generation
        generateClipsFromRecording({
          ...recording,
          duration: Math.round(duration),
          mux_playback_id: playbackId,
        }).catch(console.error);

        break;
      }

      case 'video.asset.errored': {
        // Asset processing failed
        const assetId = data.id;

        await supabase
          .from('stream_recordings')
          .update({
            processing_status: 'failed',
          })
          .eq('mux_asset_id', assetId);

        break;
      }

      case 'video.asset.deleted': {
        // Asset was deleted
        const assetId = data.id;

        await supabase
          .from('stream_recordings')
          .update({
            processing_status: 'failed',
          })
          .eq('mux_asset_id', assetId);

        break;
      }

      default:
        console.log('Unhandled Mux webhook type:', type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling Mux webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

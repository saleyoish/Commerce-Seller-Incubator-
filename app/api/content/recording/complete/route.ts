// API route for completing a recording upload and triggering processing
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { getAsset } from '@/lib/services/mux-stub';
import { generateClipsFromRecording } from '@/lib/services/clip-generation';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { recordingId } = body;

    if (!recordingId) {
      return NextResponse.json(
        { error: 'Missing required field: recordingId' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // Get recording details
    const { data: recording, error: recordingError } = await supabase
      .from('stream_recordings')
      .select('*')
      .eq('id', recordingId)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // Get Mux asset details
    if (!recording.mux_asset_id) {
      return NextResponse.json(
        { error: 'Recording has no Mux asset ID' },
        { status: 400 }
      );
    }

    const muxAsset = await getAsset(recording.mux_asset_id);

    if (!muxAsset) {
      return NextResponse.json(
        { error: 'Mux asset not found' },
        { status: 404 }
      );
    }

    if (muxAsset.status !== 'ready') {
      return NextResponse.json(
        { error: 'Mux asset not ready yet', status: muxAsset.status },
        { status: 202 }
      );
    }

    // Update recording with asset details
    const { error: updateError } = await supabase
      .from('stream_recordings')
      .update({
        download_status: 'completed',
        processing_status: 'ready',
        duration: muxAsset.duration,
        resolution: muxAsset.max_stored_resolution,
        mux_playback_id: muxAsset.playback_ids?.[0]?.id,
      })
      .eq('id', recordingId);

    if (updateError) {
      console.error('Error updating recording:', updateError);
      return NextResponse.json(
        { error: 'Failed to update recording' },
        { status: 500 }
      );
    }

    // Trigger clip generation asynchronously
    // Don't await this - let it run in background
    generateClipsFromRecording({
      ...recording,
      duration: muxAsset.duration || 0,
      mux_playback_id: muxAsset.playback_ids?.[0]?.id,
    }).catch(console.error);

    return NextResponse.json({
      message: 'Recording upload completed and clip generation started',
      recordingId,
      assetStatus: muxAsset.status,
      duration: muxAsset.duration,
    });
  } catch (error) {
    console.error('Error completing recording:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

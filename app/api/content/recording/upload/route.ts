// API route for uploading stream recordings to Mux
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { createAssetFromUpload } from '@/lib/services/mux-stub';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { streamSessionId, sellerId, source = 'manual_upload' } = body;

    if (!streamSessionId || !sellerId) {
      return NextResponse.json(
        { error: 'Missing required fields: streamSessionId, sellerId' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // Create Mux upload URL
    const { uploadUrl, assetId: muxUploadId } = await createAssetFromUpload();

    // Create recording record
    const { data: recording, error } = await supabase
      .from('stream_recordings')
      .insert({
        stream_session_id: streamSessionId,
        seller_id: sellerId,
        source,
        download_status: 'pending',
        processing_status: 'pending',
        mux_asset_id: muxUploadId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating recording:', error);
      return NextResponse.json(
        { error: 'Failed to create recording record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      recording,
      uploadUrl,
      message: 'Upload URL created successfully',
    });
  } catch (error) {
    console.error('Error in recording upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

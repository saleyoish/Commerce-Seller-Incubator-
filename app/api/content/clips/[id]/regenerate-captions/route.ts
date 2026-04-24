// API route for regenerating captions for a clip
import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { regenerateCaptions } from '@/lib/services/clip-generation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createServerSideSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: clipId } = await params;

    // Get clip with recording info
    const { data: clip, error: clipError } = await supabase
      .from('generated_clips')
      .select(`
        *,
        stream_recordings(mux_playback_id)
      `)
      .eq('id', clipId)
      .single();

    if (clipError || !clip) {
      return NextResponse.json(
        { error: 'Clip not found' },
        { status: 404 }
      );
    }

    // Check authorization
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!seller || clip.seller_id !== seller.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if clip has playback
    const playbackId = clip.raw_clip_path || clip.stream_recordings?.mux_playback_id;
    if (!playbackId) {
      return NextResponse.json(
        { error: 'Clip has no playback available' },
        { status: 400 }
      );
    }

    // Regenerate captions
    const success = await regenerateCaptions(clipId, playbackId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to regenerate captions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Captions regenerated successfully',
    });
  } catch (error) {
    console.error('Error regenerating captions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

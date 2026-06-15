// API route for regenerating captions for a clip
import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyJWT } from '@/lib/jwt';
import { db } from '@/lib/db';
import { regenerateCaptions } from '@/lib/services/clip-generation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const token = extractToken(request.headers);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { id: clipId } = await params;

    const { data: clip, error: clipError } = await db
      .from('generated_clips')
      .select('*, stream_recordings(mux_playback_id)')
      .eq('id', clipId)
      .single();

    if (clipError || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    const { data: seller } = await db
      .from('sellers')
      .select('id')
      .eq('id', payload.userId)
      .maybeSingle();

    if (!seller || clip.seller_id !== seller.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const playbackId = clip.raw_clip_path || clip.stream_recordings?.mux_playback_id;
    if (!playbackId) {
      return NextResponse.json({ error: 'Clip has no playback available' }, { status: 400 });
    }

    const success = await regenerateCaptions(clipId, playbackId);

    if (!success) {
      return NextResponse.json({ error: 'Failed to regenerate captions' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Captions regenerated successfully' });
  } catch (error) {
    console.error('Error regenerating captions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

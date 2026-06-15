// API route for managing generated clips
import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyJWT } from '@/lib/jwt';
import { db } from '@/lib/db';

// GET: List clips for the authenticated seller
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = extractToken(request.headers);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: seller } = await db
      .from('sellers')
      .select('id')
      .eq('id', payload.userId)
      .single();

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const approved = searchParams.get('approved');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = db
      .from('generated_clips')
      .select('*, clip_captions(*)')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (approved !== null) {
      query = query.eq('approved', approved === 'true');
    }

    const { data: clips, error } = await query;

    if (error) {
      console.error('Error fetching clips:', error);
      return NextResponse.json({ error: 'Failed to fetch clips' }, { status: 500 });
    }

    return NextResponse.json({ clips });
  } catch (error) {
    console.error('Error in clips GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Generate new clips from a recording
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = extractToken(request.headers);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();
    const { recordingId } = body;

    if (!recordingId) {
      return NextResponse.json({ error: 'Missing required field: recordingId' }, { status: 400 });
    }

    const { data: seller } = await db
      .from('sellers')
      .select('id')
      .eq('id', payload.userId)
      .single();

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    const { data: recording, error: recordingError } = await db
      .from('stream_recordings')
      .select('*')
      .eq('id', recordingId)
      .eq('seller_id', seller.id)
      .single();

    if (recordingError || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    if (recording.processing_status !== 'ready') {
      return NextResponse.json({ error: 'Recording not ready for clip generation' }, { status: 400 });
    }

    const { generateClipsFromRecording } = await import('@/lib/services/clip-generation');
    generateClipsFromRecording(recording).catch(console.error);

    return NextResponse.json({
      message: 'Clip generation started',
      recordingId,
    });
  } catch (error) {
    console.error('Error in clips POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

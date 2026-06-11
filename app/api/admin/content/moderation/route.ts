// Admin API route for content moderation
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { extractToken, verifyJWT } from '@/lib/jwt';

// GET: List clips pending moderation
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify JWT and admin privileges
    const token = extractToken(request.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check admin by id (custom auth) or user_id (Supabase auth)
    const { data: admin } = await db
      .from('admins')
      .select('id')
      .or(`id.eq.${payload.userId},user_id.eq.${payload.userId}`)
      .maybeSingle();

    if (!admin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get URL params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db
      .from('generated_clips')
      .select(`
        *,
        clip_captions(*),
        stream_recordings!inner(
          mux_playback_id,
          source,
          stream_sessions!inner(title)
        ),
        sellers!inner(
          email,
          user_id
        )
      `)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status === 'pending') {
      query = query.eq('approved', false).eq('rejected', false);
    } else if (status === 'approved') {
      query = query.eq('approved', true);
    } else if (status === 'rejected') {
      query = query.eq('rejected', true);
    }

    const { data: clips, error } = await query;

    if (error) {
      console.error('Error fetching clips for moderation:', error);
      return NextResponse.json(
        { error: 'Failed to fetch clips' },
        { status: 500 }
      );
    }

    return NextResponse.json({ clips });
  } catch (error) {
    console.error('Error in moderation GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Batch approve/reject clips
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const adminSupabase = createAdminSupabase();
    
    // Verify JWT and admin privileges
    const token = extractToken(request.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check admin by id (custom auth) or user_id (Supabase auth)
    const { data: admin } = await db
      .from('admins')
      .select('id')
      .or(`id.eq.${payload.userId},user_id.eq.${payload.userId}`)
      .maybeSingle();

    if (!admin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { clipIds, action, rejectionReason } = body;

    if (!clipIds || !Array.isArray(clipIds) || clipIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid clipIds' },
        { status: 400 }
      );
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const updates = {
      approved: action === 'approve',
      rejected: action === 'reject',
      rejection_reason: action === 'reject' ? (rejectionReason || 'No reason provided') : null,
      approved_by: payload.userId,
      approved_at: new Date().toISOString(),
    };

    const { data: updatedClips, error } = await adminSupabase
      .from('generated_clips')
      .update(updates)
      .in('id', clipIds)
      .select();

    if (error) {
      console.error('Error batch updating clips:', error);
      return NextResponse.json(
        { error: 'Failed to update clips' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `${clipIds.length} clips ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      clips: updatedClips,
    });
  } catch (error) {
    console.error('Error in moderation POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

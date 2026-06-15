// API route for rejecting a clip (admin only)
import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyJWT } from '@/lib/jwt';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { db } from '@/lib/db';

export async function PUT(
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

    const { data: admin } = await db
      .from('admins')
      .select('id')
      .eq('id', payload.userId)
      .maybeSingle();

    if (!admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const adminSupabase = createAdminSupabase();
    const { id: clipId } = await params;
    const body = await request.json();
    const { reason } = body;

    const { data: clip, error: clipError } = await db
      .from('generated_clips')
      .select('*')
      .eq('id', clipId)
      .single();

    if (clipError || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    const { data: updatedClip, error } = await adminSupabase
      .from('generated_clips')
      .update({
        approved: false,
        rejected: true,
        rejection_reason: reason || 'No reason provided',
        approved_by: payload.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', clipId)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting clip:', error);
      return NextResponse.json({ error: 'Failed to reject clip' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Clip rejected successfully', clip: updatedClip });
  } catch (error) {
    console.error('Error rejecting clip:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

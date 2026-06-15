// API route for approving a clip (seller or admin)
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

    const adminSupabase = createAdminSupabase();
    const { id: clipId } = await params;

    const { data: admin } = await db
      .from('admins')
      .select('id')
      .eq('id', payload.userId)
      .maybeSingle();

    const { data: clip, error: clipError } = await db
      .from('generated_clips')
      .select('seller_id')
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

    const isOwner = !!seller && clip.seller_id === seller.id;
    const isAdmin = !!admin;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: updatedClip, error } = await adminSupabase
      .from('generated_clips')
      .update({
        approved: true,
        approved_by: payload.userId,
        approved_at: new Date().toISOString(),
        rejected: false,
        rejection_reason: null,
      })
      .eq('id', clipId)
      .select()
      .single();

    if (error) {
      console.error('Error approving clip:', error);
      return NextResponse.json({ error: 'Failed to approve clip' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Clip approved successfully', clip: updatedClip });
  } catch (error) {
    console.error('Error approving clip:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// API route for approving a clip (seller or admin)
import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { createAdminSupabase } from '@/lib/supabase-admin';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createServerSideSupabase();
    const adminSupabase = createAdminSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: clipId } = await params;

    // Check if user is admin
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Get clip
    const { data: clip, error: clipError } = await supabase
      .from('generated_clips')
      .select('*, sellers!inner(user_id)')
      .eq('id', clipId)
      .single();

    if (clipError || !clip) {
      return NextResponse.json(
        { error: 'Clip not found' },
        { status: 404 }
      );
    }

    // Check authorization - must be owner or admin
    const isOwner = clip.sellers?.user_id === user.id;
    const isAdmin = !!admin;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Update clip
    const { data: updatedClip, error } = await adminSupabase
      .from('generated_clips')
      .update({
        approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejected: false,
        rejection_reason: null,
      })
      .eq('id', clipId)
      .select()
      .single();

    if (error) {
      console.error('Error approving clip:', error);
      return NextResponse.json(
        { error: 'Failed to approve clip' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Clip approved successfully',
      clip: updatedClip,
    });
  } catch (error) {
    console.error('Error approving clip:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

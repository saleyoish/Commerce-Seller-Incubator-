// API route for rejecting a clip (admin only)
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

    // Check if user is admin
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!admin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { id: clipId } = await params;
    const body = await request.json();
    const { reason } = body;

    // Get clip
    const { data: clip, error: clipError } = await supabase
      .from('generated_clips')
      .select('*')
      .eq('id', clipId)
      .single();

    if (clipError || !clip) {
      return NextResponse.json(
        { error: 'Clip not found' },
        { status: 404 }
      );
    }

    // Update clip
    const { data: updatedClip, error } = await adminSupabase
      .from('generated_clips')
      .update({
        approved: false,
        rejected: true,
        rejection_reason: reason || 'No reason provided',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', clipId)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting clip:', error);
      return NextResponse.json(
        { error: 'Failed to reject clip' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Clip rejected successfully',
      clip: updatedClip,
    });
  } catch (error) {
    console.error('Error rejecting clip:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

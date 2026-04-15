import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { createAdminSupabase } from '@/lib/supabase-admin';

// GET - Public endpoint to fetch seller config by sellerId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');

    if (!sellerId) {
      return NextResponse.json(
        { error: 'Seller ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    const { data: seller, error } = await supabase
      .from('sellers')
      .select('id, email, stream_embed_url, schedule_text, approval_status')
      .eq('id', sellerId)
      .single();

    if (error || !seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }

    // Only return config for approved sellers
    if (seller.approval_status !== 'approved') {
      return NextResponse.json(
        { error: 'Seller not approved' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      sellerId: seller.id,
      email: seller.email,
      streamEmbedUrl: seller.stream_embed_url,
      scheduleText: seller.schedule_text,
    });
  } catch (error: any) {
    console.error('Get seller config error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch seller config' },
      { status: 500 }
    );
  }
}

// POST - Protected endpoint to update seller's own config
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSideSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { streamEmbedUrl, scheduleText } = await request.json();

    // Validate URL if provided
    if (streamEmbedUrl) {
      try {
        new URL(streamEmbedUrl);
      } catch {
        return NextResponse.json(
          { error: 'Invalid stream embed URL' },
          { status: 400 }
        );
      }
    }

    // Update seller record
    const { data: seller, error } = await supabase
      .from('sellers')
      .update({
        stream_embed_url: streamEmbedUrl || null,
        schedule_text: scheduleText || 'Live shows: Check back for schedule',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      seller: {
        streamEmbedUrl: seller.stream_embed_url,
        scheduleText: seller.schedule_text,
      },
    });
  } catch (error: any) {
    console.error('Update seller config error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update seller config' },
      { status: 500 }
    );
  }
}

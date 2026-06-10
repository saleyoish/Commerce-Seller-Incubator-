import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { getClipSocialPosts, getSellerSocialPosts } from '@/lib/services/social-media-poster';

// GET - Get social media posts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clipId = searchParams.get('clipId');

    // Get seller record
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    let posts;

    if (clipId) {
      // Get posts for specific clip
      // Verify clip belongs to seller
      const { data: clip } = await supabase
        .from('generated_clips')
        .select('seller_id')
        .eq('id', clipId)
        .single();

      if (!clip || clip.seller_id !== seller.id) {
        return NextResponse.json({ error: 'Unauthorized access to clip' }, { status: 403 });
      }

      posts = await getClipSocialPosts(clipId);
    } else {
      // Get all posts for seller
      posts = await getSellerSocialPosts(seller.id);
    }

    return NextResponse.json({
      success: true,
      posts,
    });

  } catch (error: any) {
    console.error('Get social posts error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

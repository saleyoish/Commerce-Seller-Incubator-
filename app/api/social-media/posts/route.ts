import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyJWT } from '@/lib/jwt';
import { db } from '@/lib/db';
import { getClipSocialPosts, getSellerSocialPosts } from '@/lib/services/social-media-poster';

// GET - Get social media posts
export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request.headers);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clipId = searchParams.get('clipId');

    const { data: seller, error: sellerError } = await db
      .from('sellers')
      .select('id')
      .eq('id', payload.userId)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    let posts;

    if (clipId) {
      const { data: clip } = await db
        .from('generated_clips')
        .select('seller_id')
        .eq('id', clipId)
        .single();

      if (!clip || clip.seller_id !== seller.id) {
        return NextResponse.json({ error: 'Unauthorized access to clip' }, { status: 403 });
      }

      posts = await getClipSocialPosts(clipId);
    } else {
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

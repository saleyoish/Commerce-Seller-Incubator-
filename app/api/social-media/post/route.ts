import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyJWT } from '@/lib/jwt';
import { db } from '@/lib/db';
import { postClipToSocial, generateCaption, getSuggestedHashtags } from '@/lib/services/social-media-poster';

// POST - Post clip to social media platforms
export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request.headers);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { clipId, platforms, caption, hashtags, scheduledTime, publishImmediately } = await request.json();

    if (!clipId || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json({ error: 'Clip ID and platforms are required' }, { status: 400 });
    }

    const { data: seller } = await db
      .from('sellers')
      .select('id')
      .eq('id', payload.userId)
      .single();

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    const { data: clip, error: clipError } = await db
      .from('generated_clips')
      .select('seller_id')
      .eq('id', clipId)
      .single();

    if (clipError || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    if (clip.seller_id !== seller.id) {
      return NextResponse.json({ error: 'Unauthorized access to clip' }, { status: 403 });
    }

    const finalCaption = caption || 'Check out this clip from my live stream!';
    const finalHashtags = hashtags && hashtags.length > 0 ? hashtags : getSuggestedHashtags();
    const finalCaptionWithTags = generateCaption(finalCaption, finalHashtags);

    const results = await postClipToSocial({
      clipId,
      platforms,
      caption: finalCaptionWithTags,
      hashtags: finalHashtags,
      scheduledTime,
      publishImmediately: publishImmediately !== false,
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Social media post error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

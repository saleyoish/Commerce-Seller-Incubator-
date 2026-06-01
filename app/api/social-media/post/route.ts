import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';
import { postClipToSocial, generateCaption, getSuggestedHashtags } from '@/lib/services/social-media-poster';

// POST - Post clip to social media platforms
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clipId, platforms, caption, hashtags, scheduledTime, publishImmediately } = await request.json();

    // Validate required fields
    if (!clipId || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Clip ID and platforms are required' },
        { status: 400 }
      );
    }

    // Verify clip belongs to seller
    const { data: clip, error: clipError } = await supabase
      .from('generated_clips')
      .select('seller_id')
      .eq('id', clipId)
      .single();

    if (clipError || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    // Verify seller owns this clip
    const { data: seller } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!seller || seller.id !== clip.seller_id) {
      return NextResponse.json({ error: 'Unauthorized access to clip' }, { status: 403 });
    }

    // Generate caption with hashtags if not provided
    const finalCaption = caption || 'Check out this clip from my live stream!';
    const finalHashtags = hashtags && hashtags.length > 0 ? hashtags : getSuggestedHashtags();
    const finalCaptionWithTags = generateCaption(finalCaption, finalHashtags);

    // Post to social media
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
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Social Media Posting Automation Service
// Handles auto-posting clips to TikTok, Instagram Reels, YouTube Shorts

import { createAdminSupabase } from '@/lib/supabase-admin';

export interface SocialPostConfig {
  clipId: string;
  platforms: ('tiktok' | 'instagram' | 'youtube')[];
  caption: string;
  hashtags: string[];
  scheduledTime?: string;
  publishImmediately?: boolean;
}

export interface SocialPostResult {
  platform: string;
  postId?: string;
  status: 'success' | 'failed' | 'scheduled';
  error?: string;
}

// Post clip to social media platforms
export async function postClipToSocial(config: SocialPostConfig): Promise<SocialPostResult[]> {
  const supabase = createAdminSupabase();
  const results: SocialPostResult[] = [];
  
  // Get clip details
  const { data: clip, error: clipError } = await supabase
    .from('generated_clips')
    .select('*, stream_recording_id, seller_id')
    .eq('id', config.clipId)
    .single();
  
  if (clipError || !clip) {
    throw new Error('Clip not found');
  }
  
  // Get clip video URL
  const videoUrl = clip.raw_clip_path || clip.final_clip_path;
  if (!videoUrl) {
    throw new Error('Clip video URL not found');
  }
  
  for (const platform of config.platforms) {
    try {
      let result: SocialPostResult;
      
      if (config.publishImmediately) {
        result = await postImmediately(platform, videoUrl, config.caption, config.hashtags);
      } else if (config.scheduledTime) {
        result = await schedulePost(platform, config.clipId, videoUrl, config.caption, config.hashtags, config.scheduledTime);
      } else {
        result = await postImmediately(platform, videoUrl, config.caption, config.hashtags);
      }
      
      results.push(result);
      
      // Store post record
      if (result.status === 'success' || result.status === 'scheduled') {
        await supabase
          .from('social_posts')
          .insert({
            clip_id: config.clipId,
            seller_id: clip.seller_id,
            platform: platform,
            post_id: result.postId,
            caption: config.caption,
            hashtags: config.hashtags,
            status: result.status,
            scheduled_at: config.scheduledTime || null,
            posted_at: result.status === 'success' ? new Date().toISOString() : null,
          });
      }
    } catch (error: any) {
      results.push({
        platform,
        status: 'failed',
        error: error.message,
      });
    }
  }
  
  return results;
}

// Post immediately to platform
async function postImmediately(
  platform: string,
  videoUrl: string,
  caption: string,
  hashtags: string[]
): Promise<SocialPostResult> {
  switch (platform) {
    case 'tiktok':
      return await postToTikTok(videoUrl, caption, hashtags);
    case 'instagram':
      return await postToInstagram(videoUrl, caption, hashtags);
    case 'youtube':
      return await postToYouTube(videoUrl, caption, hashtags);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

// Schedule post for later
async function schedulePost(
  platform: string,
  clipId: string,
  videoUrl: string,
  caption: string,
  hashtags: string[],
  scheduledTime: string
): Promise<SocialPostResult> {
  // Store scheduled post
  return {
    platform,
    status: 'scheduled',
    postId: `scheduled-${clipId}-${platform}`,
  };
}

// Post to TikTok
async function postToTikTok(
  videoUrl: string,
  caption: string,
  hashtags: string[]
): Promise<SocialPostResult> {
  // In production, this would use TikTok's API
  // For now, simulate the post
  console.log(`Posting to TikTok: ${caption}`);
  
  // TODO: Integrate with TikTok API
  // TODO: Handle authentication
  // TODO: Upload video
  // TODO: Add caption and hashtags
  
  return {
    platform: 'tiktok',
    status: 'success',
    postId: `tiktok-${Date.now()}`,
  };
}

// Post to Instagram Reels
async function postToInstagram(
  videoUrl: string,
  caption: string,
  hashtags: string[]
): Promise<SocialPostResult> {
  // In production, this would use Instagram Graph API
  console.log(`Posting to Instagram Reels: ${caption}`);
  
  // TODO: Integrate with Instagram Graph API
  // TODO: Handle authentication
  // TODO: Upload video to Instagram
  // TODO: Publish as Reel
  
  return {
    platform: 'instagram',
    status: 'success',
    postId: `ig-${Date.now()}`,
  };
}

// Post to YouTube Shorts
async function postToYouTube(
  videoUrl: string,
  caption: string,
  hashtags: string[]
): Promise<SocialPostResult> {
  // In production, this would use YouTube Data API
  console.log(`Posting to YouTube Shorts: ${caption}`);
  
  // TODO: Integrate with YouTube Data API
  // TODO: Handle OAuth authentication
  // TODO: Upload video
  // TODO: Set as Short
  // TODO: Add metadata
  
  return {
    platform: 'youtube',
    status: 'success',
    postId: `yt-${Date.now()}`,
  };
}

// Process scheduled posts that are due
export async function processScheduledPosts() {
  const supabase = createAdminSupabase();
  const now = new Date();
  
  const { data: scheduledPosts, error } = await supabase
    .from('social_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now.toISOString());
  
  if (error || !scheduledPosts) {
    console.error('Error fetching scheduled posts:', error);
    return [];
  }
  
  const processedPosts = [];
  
  for (const post of scheduledPosts) {
    try {
      // Get clip video URL
      const { data: clip } = await supabase
        .from('generated_clips')
        .select('raw_clip_path, final_clip_path')
        .eq('id', post.clip_id)
        .single();
      
      if (!clip) continue;
      
      const videoUrl = clip.raw_clip_path || clip.final_clip_path;
      if (!videoUrl) continue;
      
      // Post to platform
      const result = await postImmediately(
        post.platform,
        videoUrl,
        post.caption,
        post.hashtags
      );
      
      // Update post record
      await supabase
        .from('social_posts')
        .update({
          status: result.status,
          post_id: result.postId,
          posted_at: new Date().toISOString(),
          error: result.error,
        })
        .eq('id', post.id);
      
      processedPosts.push(post);
    } catch (error) {
      console.error('Error processing scheduled post:', error);
    }
  }
  
  return processedPosts;
}

// Get social posts for a clip
export async function getClipSocialPosts(clipId: string) {
  const supabase = createAdminSupabase();
  
  const { data, error } = await supabase
    .from('social_posts')
    .select('*')
    .eq('clip_id', clipId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching social posts:', error);
    return [];
  }
  
  return data || [];
}

// Get all social posts for a seller
export async function getSellerSocialPosts(sellerId: string, limit = 20) {
  const supabase = createAdminSupabase();
  
  const { data, error } = await supabase
    .from('social_posts')
    .select('*, generated_clips!inner(seller_id)')
    .eq('generated_clips.seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching seller social posts:', error);
    return [];
  }
  
  return data || [];
}

// Delete a social post
export async function deleteSocialPost(postId: string) {
  const supabase = createAdminSupabase();
  
  const { error } = await supabase
    .from('social_posts')
    .delete()
    .eq('id', postId);
  
  if (error) {
    throw new Error('Failed to delete social post');
  }
  
  return { success: true };
}

// Generate caption with hashtags
export function generateCaption(baseCaption: string, hashtags: string[]): string {
  const hashtagString = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
  return `${baseCaption}\n\n${hashtagString}`;
}

// Get suggested hashtags based on content
export function getSuggestedHashtags(content?: string): string[] {
  const defaultHashtags = [
    '#LiveCommerce',
    '#TikTokShop',
    '#LiveSelling',
    '#SmallBusiness',
    '#Entrepreneur',
  ];
  
  // TODO: Use AI to generate relevant hashtags based on content
  return defaultHashtags;
}

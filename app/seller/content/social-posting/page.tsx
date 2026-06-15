'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';
import { type GeneratedClip, type SocialPost } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  Share2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Video,
  Trash2,
  ExternalLink
} from 'lucide-react';

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', color: 'bg-black text-white', icon: '🎵' },
  { id: 'instagram', name: 'Instagram Reels', color: 'bg-pink-500 text-white', icon: '📸' },
  { id: 'youtube', name: 'YouTube Shorts', color: 'bg-red-600 text-white', icon: '▶️' },
];

const DEFAULT_HASHTAGS = [
  '#LiveCommerce',
  '#TikTokShop',
  '#LiveSelling',
  '#SmallBusiness',
  '#Entrepreneur',
];

export default function SocialPostingPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<any>(null);
  const [clips, setClips] = useState<GeneratedClip[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const { user, loading } = useAuth();
  const [selectedClip, setSelectedClip] = useState<GeneratedClip | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    caption: '',
    hashtags: [...DEFAULT_HASHTAGS],
    selectedPlatforms: [] as string[],
    scheduledTime: '',
    publishImmediately: true,
  });

  useEffect(() => {
    if (loading) return;
    if (!user || !user.isSeller) {
      router.push('/login');
      return;
    }
    loadData();
  }, [loading, user]);

  const loadData = async () => {
    try {
      const response = await authFetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      const data = await response.json();
      const isSeller = data.isSeller || false;
      const sellerData = data.seller || null;
      
      if (!isSeller) {
        router.push('/login');
        return;
      }

      setSeller(sellerData);

      if (sellerData) {
        const clipsRes = await authFetch('/api/content/clips?status=ready');
        if (!clipsRes.ok) {
          const clipsResult = await clipsRes.json();
          throw new Error(clipsResult.error || 'Failed to load clips');
        }
        const clipsResult = await clipsRes.json();
        setClips(clipsResult.clips || []);

        const postsRes = await authFetch('/api/social-media/posts');
        if (!postsRes.ok) {
          const postsResult = await postsRes.json();
          throw new Error(postsResult.error || 'Failed to load social posts');
        }
        const postsResult = await postsRes.json();
        setSocialPosts(postsResult.posts || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClip) return;

    setIsPosting(true);
    setError(null);

    try {
      const response = await authFetch('/api/social-media/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipId: selectedClip.id,
          platforms: formData.selectedPlatforms,
          caption: formData.caption,
          hashtags: formData.hashtags,
          scheduledTime: formData.scheduledTime || null,
          publishImmediately: formData.publishImmediately,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to post');
      }

      // Reset form
      setFormData({
        caption: '',
        hashtags: [...DEFAULT_HASHTAGS],
        selectedPlatforms: [],
        scheduledTime: '',
        publishImmediately: true,
      });
      setShowPostForm(false);
      setSelectedClip(null);

      await loadData();
    } catch (error: any) {
      console.error('Error posting:', error);
      setError(error.message || 'Failed to post');
    } finally {
      setIsPosting(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPlatforms: prev.selectedPlatforms.includes(platformId)
        ? prev.selectedPlatforms.filter(p => p !== platformId)
        : [...prev.selectedPlatforms, platformId]
    }));
  };

  const toggleHashtag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      hashtags: prev.hashtags.includes(tag)
        ? prev.hashtags.filter(t => t !== tag)
        : [...prev.hashtags, tag]
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return <Badge className="bg-green-500 text-white">Posted</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500 text-white">Scheduled</Badge>;
      case 'failed':
        return <Badge className="bg-red-500 text-white">Failed</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Social Media Posting</h1>
        <p className="text-[var(--text-muted)] mt-1">Auto-post clips to TikTok, Instagram Reels, and YouTube Shorts</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Available Clips */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
            <Video className="w-5 h-5" />
            Available Clips
          </CardTitle>
          <CardDescription className="text-[var(--text-muted)]">
            {clips.length} clips ready to post
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clips.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No clips available yet</p>
              <p className="text-sm mt-1">Complete a stream to generate clips</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className="border border-[var(--border-default)] rounded-lg p-4 bg-[var(--bg-raised)] hover:border-[var(--accent-primary)] transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedClip(clip);
                    setShowPostForm(true);
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">Clip #{clip.clip_number}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Duration: {Math.round(clip.duration || 0)}s
                  </p>
                  <Button size="sm" className="w-full mt-3 btn-primary">
                    <Share2 className="w-3 h-3 mr-1" />
                    Post to Social
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post Form Modal */}
      {showPostForm && selectedClip && (
        <Card className="card-premium border-2 border-[var(--accent-primary)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[var(--text-primary)]">Post Clip to Social Media</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPostForm(false);
                  setSelectedClip(null);
                }}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription className="text-[var(--text-muted)]">
              Clip #{selectedClip.clip_number} • {Math.round(selectedClip.duration || 0)}s
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePostSubmit} className="space-y-6">
              {/* Platform Selection */}
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Select Platforms *</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => togglePlatform(platform.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        formData.selectedPlatforms.includes(platform.id)
                          ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                          : 'bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]'
                      }`}
                    >
                      <span className="mr-1">{platform.icon}</span>
                      {formData.selectedPlatforms.includes(platform.id) && (
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                      )}
                      {platform.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Caption */}
              <div className="space-y-2">
                <Label htmlFor="caption" className="text-[var(--text-secondary)]">Caption</Label>
                <Textarea
                  id="caption"
                  placeholder="What's this clip about?"
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  rows={3}
                  className="input-premium"
                />
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Hashtags</Label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_HASHTAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleHashtag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                        formData.hashtags.includes(tag)
                          ? 'bg-[var(--accent-secondary)] border-[var(--accent-secondary)] text-white'
                          : 'bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-secondary)]'
                      }`}
                    >
                      {formData.hashtags.includes(tag) && (
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                      )}
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule Options */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="publishImmediately"
                    checked={formData.publishImmediately}
                    onChange={(e) => 
                      setFormData({ ...formData, publishImmediately: e.target.checked })
                    }
                    className="rounded border-[var(--border-default)] bg-[var(--bg-input)]"
                  />
                  <Label htmlFor="publishImmediately" className="text-[var(--text-secondary)]">
                    Publish immediately
                  </Label>
                </div>

                {!formData.publishImmediately && (
                  <div className="space-y-2">
                    <Label htmlFor="scheduledTime" className="text-[var(--text-secondary)]">Schedule for</Label>
                    <Input
                      id="scheduledTime"
                      type="datetime-local"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      className="input-premium"
                    />
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="btn-primary"
                  disabled={isPosting || formData.selectedPlatforms.length === 0}
                >
                  {isPosting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Post Now
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPostForm(false);
                    setSelectedClip(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recent Posts */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Posts
          </CardTitle>
          <CardDescription className="text-[var(--text-muted)]">
            {socialPosts.length} posts across platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          {socialPosts.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <Share2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No posts yet</p>
              <p className="text-sm mt-1">Post your first clip to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {socialPosts.map((post) => (
                <div key={post.id} className="border border-[var(--border-default)] rounded-lg p-4 bg-[var(--bg-raised)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="capitalize border-[var(--border-default)] text-[var(--text-muted)]">
                          {post.platform}
                        </Badge>
                        {getStatusBadge(post.status)}
                      </div>
                      <p className="text-sm text-[var(--text-primary)] line-clamp-2 mb-2">
                        {post.caption}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                        {post.posted_at && (
                          <span>Posted: {new Date(post.posted_at).toLocaleString()}</span>
                        )}
                        {post.scheduled_at && !post.posted_at && (
                          <span>Scheduled: {new Date(post.scheduled_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    {post.post_id && (
                      <Button size="sm" variant="ghost" className="text-[var(--text-muted)]">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

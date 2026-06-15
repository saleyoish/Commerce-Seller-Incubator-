'use client';

import { useEffect, useState } from 'react';
import { authFetch, checkIsAdmin } from '@/lib/auth';
import { type GeneratedClip, type ClipCaption } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Film, CheckCircle, XCircle, ExternalLink, Play, Loader2 } from 'lucide-react';

interface ClipWithDetails extends GeneratedClip {
  clip_captions?: ClipCaption[];
  stream_recordings?: {
    mux_playback_id: string;
    source: string;
    stream_sessions?: {
      title: string;
    };
  };
  sellers?: {
    email: string;
    id: string;
  };
}

export default function AdminContentModerationPage() {
  const [clips, setClips] = useState<ClipWithDetails[]>([]);
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    checkAdminAndLoadClips();
  }, []);

  const checkAdminAndLoadClips = async () => {
    try {
      const isAdminUser = await checkIsAdmin();
      if (!isAdminUser) {
        return;
      }
      setIsAdmin(true);

      // Load pending clips
      await loadClips();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadClips = async () => {
    try {
      const response = await authFetch('/api/admin/content/moderation?status=pending');
      if (response.ok) {
        const data = await response.json();
        setClips(data.clips || []);
      }
    } catch (error) {
      console.error('Error loading clips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchAction = async (action: 'approve' | 'reject') => {
    if (selectedClips.size === 0) return;
    
    setActionLoading(true);
    try {
      const response = await authFetch('/api/admin/content/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipIds: Array.from(selectedClips),
          action,
        }),
      });

      if (response.ok) {
        setSelectedClips(new Set());
        await loadClips();
      }
    } catch (error) {
      console.error('Error performing batch action:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveClip = async (clipId: string) => {
    try {
      const response = await authFetch(`/api/content/clips/${clipId}/approve`, {
        method: 'PUT',
      });

      if (response.ok) {
        setClips(clips.filter(c => c.id !== clipId));
      }
    } catch (error) {
      console.error('Error approving clip:', error);
    }
  };

  const handleRejectClip = async (clipId: string) => {
    try {
      const response = await authFetch(`/api/content/clips/${clipId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by admin' }),
      });

      if (response.ok) {
        setClips(clips.filter(c => c.id !== clipId));
      }
    } catch (error) {
      console.error('Error rejecting clip:', error);
    }
  };

  const toggleClipSelection = (clipId: string) => {
    const newSelected = new Set(selectedClips);
    if (newSelected.has(clipId)) {
      newSelected.delete(clipId);
    } else {
      newSelected.add(clipId);
    }
    setSelectedClips(newSelected);
  };

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-gray-500 mt-2">You do not have permission to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Film className="h-8 w-8" />
          Content Moderation
        </h1>
        <p className="text-gray-600 mt-2">
          Review and approve auto-generated clips before they are posted
        </p>
      </div>

      {/* Batch Actions */}
      {selectedClips.size > 0 && (
        <Card className="mb-6 sticky top-4 z-10 bg-white shadow-lg">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium">{selectedClips.size} clips selected</span>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleBatchAction('approve')}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Approve All
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleBatchAction('reject')}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                Reject All
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedClips(new Set())}
            >
              Clear Selection
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Review ({clips.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {clips.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h2 className="text-xl font-semibold">All Caught Up!</h2>
                <p className="text-gray-500 mt-2">No clips pending moderation.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clips.map((clip) => (
                <Card key={clip.id} className="overflow-hidden">
                  {/* Selection checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedClips.has(clip.id)}
                      onChange={() => toggleClipSelection(clip.id)}
                      className="w-5 h-5 rounded border-2 border-[var(--border-default)] bg-[var(--bg-surface)] checked:bg-[var(--accent-primary)] checked:border-[var(--accent-primary)]"
                    />
                  </div>

                  <CardHeader className="pb-0">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">Clip #{clip.clip_number}</CardTitle>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <CardDescription className="flex flex-col gap-1">
                      <span>Seller: {clip.sellers?.email}</span>
                      <span>Stream: {clip.stream_recordings?.stream_sessions?.title || 'Untitled'}</span>
                      <span>Time: {Math.floor(clip.start_time / 60)}:{String(clip.start_time % 60).padStart(2, '0')}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4">
                    {/* Thumbnail */}
                    {clip.stream_recordings?.mux_playback_id ? (
                      <div className="relative">
                        <img 
                          src={`https://image.mux.com/${clip.stream_recordings.mux_playback_id}/thumbnail.png?time=${clip.start_time}`}
                          alt="Clip thumbnail"
                          className="w-full h-40 object-cover rounded"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <a 
                            href={`https://stream.mux.com/${clip.stream_recordings.mux_playback_id}.m3u8`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                          >
                            <Play className="h-6 w-6 text-white" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-40 bg-gray-100 rounded flex items-center justify-center">
                        <Film className="h-8 w-8 text-gray-400" />
                      </div>
                    )}

                    {/* Caption */}
                    {clip.clip_captions?.[0]?.transcript_text && (
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-sm text-gray-600 line-clamp-3">
                          "{clip.clip_captions[0].transcript_text}"
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>Confidence: {Math.round((clip.clip_captions[0].confidence_score || 0) * 100)}%</span>
                          <span>•</span>
                          <span>{clip.clip_captions[0].word_count} words</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="default" 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleApproveClip(clip.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleRejectClip(clip.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClientSideSupabase, type GeneratedClip, type ClipCaption } from "@/lib/supabase-client";
import { checkUserStatus } from "@/lib/auth";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Film, CheckCircle, XCircle, Clock, ExternalLink, RefreshCw } from 'lucide-react';

interface ClipWithCaption extends GeneratedClip {
  clip_captions?: ClipCaption[];
  stream_recordings?: {
    mux_playback_id: string;
    source: string;
  };
}

export default function ContentManagementPage() {
  const [clips, setClips] = useState<ClipWithCaption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sellerId, setSellerId] = useState<string | null>(null);

  useEffect(() => {
    loadClips();
  }, []);

  const loadClips = async () => {
    try {
      const res = await fetch('/api/auth/check-user', { credentials: 'include' });
      if (!res.ok) return;
      const userData = await res.json();
      if (!userData.user) return;

      const { db: dbClient } = await import('@/lib/db');

      const { data: seller } = await dbClient
        .from('sellers')
        .select('id')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (!seller && !userData.isAdmin) return;

      if (seller) {
        setSellerId(seller.id);
        const { data: clipsData } = await dbClient
          .from('generated_clips')
          .select('*, clip_captions(*), stream_recordings(mux_playback_id, source)')
          .eq('seller_id', seller.id)
          .order('created_at', { ascending: false });
        setClips(clipsData || []);
      }
    } catch (error) {
      console.error('Error loading clips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (clip: ClipWithCaption) => {
    if (clip.rejected) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
    }
    if (clip.approved) {
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
    }
    if (clip.status === 'ready') {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>;
    }
    return <Badge variant="outline">{clip.status}</Badge>;
  };

  const handleApprove = async (clipId: string) => {
    try {
      const response = await fetch(`/api/content/clips/${clipId}/approve`, {
        method: 'PUT',
      });

      if (response.ok) {
        setClips(clips.map(c => 
          c.id === clipId ? { ...c, approved: true, rejected: false } : c
        ));
      }
    } catch (error) {
      console.error('Error approving clip:', error);
    }
  };

  const filteredClips = {
    all: clips,
    pending: clips.filter(c => c.status === 'ready' && !c.approved && !c.rejected),
    approved: clips.filter(c => c.approved),
    rejected: clips.filter(c => c.rejected),
  };

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
          Content Management
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your auto-generated clips from live streams
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">
            All ({filteredClips.all.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Review ({filteredClips.pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({filteredClips.approved.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({filteredClips.rejected.length})
          </TabsTrigger>
        </TabsList>

        {['all', 'pending', 'approved', 'rejected'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {filteredClips[tab as keyof typeof filteredClips].length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Film className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {tab === 'all' 
                      ? "No clips generated yet. Start a live stream to generate clips!"
                      : `No ${tab} clips.`
                    }
                  </p>
                  {tab === 'all' && (
                    <Link href="/seller/streaming">
                      <Button className="mt-4">Go to Streaming</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClips[tab as keyof typeof filteredClips].map((clip) => (
                  <Card key={clip.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">Clip #{clip.clip_number}</CardTitle>
                        {getStatusBadge(clip)}
                      </div>
                      <CardDescription>
                        {Math.floor(clip.start_time / 60)}:{String(clip.start_time % 60).padStart(2, '0')} - {clip.duration}s
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Thumbnail preview */}
                      {clip.thumbnail_path ? (
                        <img 
                          src={clip.thumbnail_path} 
                          alt="Clip thumbnail"
                          className="w-full h-32 object-cover rounded"
                        />
                      ) : clip.stream_recordings?.mux_playback_id ? (
                        <img 
                          src={`https://image.mux.com/${clip.stream_recordings.mux_playback_id}/thumbnail.png?time=${clip.start_time}`}
                          alt="Clip thumbnail"
                          className="w-full h-32 object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                          <Film className="h-8 w-8 text-gray-400" />
                        </div>
                      )}

                      {/* Caption preview */}
                      {clip.clip_captions?.[0]?.transcript_text && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          "{clip.clip_captions[0].transcript_text.slice(0, 100)}..."
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        {clip.stream_recordings?.mux_playback_id && (
                          <a 
                            href={`https://stream.mux.com/${clip.stream_recordings.mux_playback_id}.m3u8`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </a>
                        )}
                        
                        {!clip.approved && !clip.rejected && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleApprove(clip.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}

                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => loadClips()}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

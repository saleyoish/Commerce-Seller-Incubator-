'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientSideSupabase, type StreamSession, type Seller } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Radio,
  Video,
  Eye,
  DollarSign,
  Clock,
  Calendar,
  Plus,
  Settings,
  Play,
  Square,
  ExternalLink,
  TrendingUp
} from 'lucide-react';

export default function StreamingDashboardPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [activeStream, setActiveStream] = useState<StreamSession | null>(null);
  const [upcomingStreams, setUpcomingStreams] = useState<StreamSession[]>([]);
  const [pastStreams, setPastStreams] = useState<StreamSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStreamingData();
  }, []);

  const loadStreamingData = async () => {
    try {
      const supabase = createClientSideSupabase();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: sellerData } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!sellerData) {
        router.push('/signup');
        return;
      }

      setSeller(sellerData);

      // Get active/live stream
      const { data: activeData } = await supabase
        .from('stream_sessions')
        .select('*')
        .eq('seller_id', sellerData.id)
        .eq('status', 'live')
        .maybeSingle();

      setActiveStream(activeData);

      // Get upcoming streams
      const { data: upcomingData } = await supabase
        .from('stream_sessions')
        .select('*')
        .eq('seller_id', sellerData.id)
        .eq('status', 'scheduled')
        .gte('scheduled_start', new Date().toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(5);

      setUpcomingStreams(upcomingData || []);

      // Get past streams
      const { data: pastData } = await supabase
        .from('stream_sessions')
        .select('*')
        .eq('seller_id', sellerData.id)
        .in('status', ['ended', 'cancelled'])
        .order('actual_end', { ascending: false })
        .limit(5);

      setPastStreams(pastData || []);
    } catch (error) {
      console.error('Error loading streaming data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startStream = async (sessionId: string) => {
    try {
      const supabase = createClientSideSupabase();
      const { error } = await supabase
        .from('stream_sessions')
        .update({ 
          status: 'live', 
          actual_start: new Date().toISOString() 
        })
        .eq('id', sessionId);

      if (error) throw error;
      
      await loadStreamingData();
    } catch (error) {
      console.error('Error starting stream:', error);
    }
  };

  const endStream = async (sessionId: string) => {
    try {
      const supabase = createClientSideSupabase();
      const { error } = await supabase
        .from('stream_sessions')
        .update({ 
          status: 'ended', 
          actual_end: new Date().toISOString() 
        })
        .eq('id', sessionId);

      if (error) throw error;
      
      await loadStreamingData();
    } catch (error) {
      console.error('Error ending stream:', error);
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const minutes = Math.floor((endTime - startTime) / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Streaming Dashboard</h1>
        <p className="text-gray-600">Manage your live shows and multi-stream setup</p>
      </div>

      {/* Active Stream Widget */}
      {activeStream ? (
        <Card className="mb-8 border-red-300 bg-red-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                    <Radio className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                </div>
                <div>
                  <CardTitle className="text-red-700 flex items-center gap-2">
                    🔴 LIVE NOW
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                      {activeStream.platforms.length} platforms
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Started {formatDuration(activeStream.actual_start || activeStream.scheduled_start || '')} ago
                  </CardDescription>
                </div>
              </div>
              <Button 
                variant="destructive" 
                onClick={() => endStream(activeStream.id)}
              >
                <Square className="w-4 h-4 mr-2" />
                End Stream
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-500">Current Viewers</p>
                <p className="text-xl font-bold">{activeStream.total_viewers.toLocaleString()}</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-500">Peak Viewers</p>
                <p className="text-xl font-bold">{activeStream.peak_viewers.toLocaleString()}</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-500">Sales</p>
                <p className="text-xl font-bold text-green-600">${activeStream.total_sales.toLocaleString()}</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-xl font-bold">{formatDuration(activeStream.actual_start || '')}</p>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {activeStream.platforms.map((platform) => (
                <Badge key={platform} variant="secondary" className="capitalize">
                  {platform}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Video className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Stream</h3>
              <p className="text-sm text-gray-600 mb-4">
                You&apos;re not currently streaming. Start a scheduled show or go live now.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => router.push('/dashboard/schedule')}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Show
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard/streaming/setup')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Setup Guide
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/dashboard/schedule" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-3">
              <Calendar className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">Schedule Show</CardTitle>
              <CardDescription>Plan your upcoming live streams</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/dashboard/streaming/setup" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-3">
              <Settings className="w-8 h-8 text-purple-600 mb-2" />
              <CardTitle className="text-lg">Restream Setup</CardTitle>
              <CardDescription>Configure multi-streaming</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/dashboard/platforms" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-3">
              <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
              <CardTitle className="text-lg">Platforms</CardTitle>
              <CardDescription>Manage connected platforms</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Shows */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Shows</CardTitle>
                <CardDescription>Your scheduled live streams</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => router.push('/dashboard/schedule')}>
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingStreams.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming shows scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingStreams.map((stream) => (
                  <div 
                    key={stream.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{stream.title}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(stream.scheduled_start || '')}
                        <span className="flex gap-1">
                          {stream.platforms.map((p) => (
                            <Badge key={p} variant="outline" className="text-xs capitalize">
                              {p}
                            </Badge>
                          ))}
                        </span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => startStream(stream.id)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Start
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past Shows */}
        <Card>
          <CardHeader>
            <CardTitle>Past Shows</CardTitle>
            <CardDescription>Your streaming history</CardDescription>
          </CardHeader>
          <CardContent>
            {pastStreams.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No past shows yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastStreams.map((stream) => (
                  <div 
                    key={stream.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{stream.title}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {stream.total_viewers.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-green-600">
                          <DollarSign className="w-3 h-3" />
                          {stream.total_sales.toLocaleString()}
                        </span>
                        <Badge 
                          variant={stream.status === 'ended' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {stream.status}
                        </Badge>
                      </div>
                    </div>
                    {stream.status === 'ended' && (
                      <Button size="sm" variant="ghost" onClick={() => router.push(`/dashboard/schedule?duplicate=${stream.id}`)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type StreamSession, type Seller } from '@/lib/supabase-client';
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
  TrendingUp,
  Copy,
  CheckCircle2
} from 'lucide-react';

export default function StreamingDashboardPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [activeStream, setActiveStream] = useState<StreamSession | null>(null);
  const [upcomingStreams, setUpcomingStreams] = useState<StreamSession[]>([]);
  const [pastStreams, setPastStreams] = useState<StreamSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [obsConfig, setObsConfig] = useState<{server: string; streamKey: string} | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [restreamConnected, setRestreamConnected] = useState(false);

  // Initial load
  useEffect(() => {
    loadStreamingData();
  }, []);

  // Polling for stream updates
  useEffect(() => {
    if (!seller?.id) return;

    const pollInterval = setInterval(() => {
      loadStreamingData();
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [seller?.id]);

  const loadStreamingData = async () => {
    try {
      setError(null);
      const authRes = await fetch('/api/auth/check-user', { credentials: 'include' });
      if (!authRes.ok) { router.push('/login'); return; }
      const userData = await authRes.json();
      if (!userData.user) { router.push('/login'); return; }
      const user = { id: userData.user.id, email: userData.user.email };
      const isAdminUser = userData.isAdmin;

      const { db: dbClient } = await import('@/lib/db');

      // Check if user is seller (include Restream credentials) with email fallback
      let sellerDataList = null;
      let sellerData = null;

      const { data: sellersById } = await dbClient
        .from('sellers')
        .select('*, restream_username, restream_stream_key')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      sellerDataList = sellersById;

      // If no sellers by user_id, or if the sellers don't have keys, try email
      if ((!sellerDataList || sellerDataList.length === 0 || !sellerDataList.some((s: any) => s.restream_stream_key && s.restream_stream_key !== 'NOT_CONFIGURED')) && user.email) {
        const { data: sellersByEmail } = await dbClient
          .from('sellers')
          .select('*, restream_username, restream_stream_key')
          .eq('email', user.email)
          .order('created_at', { ascending: false });
        
        if (sellersByEmail && sellersByEmail.length > 0) {
          // Use email sellers if they have keys, otherwise keep user_id sellers
          if (sellersByEmail.some((s: any) => s.restream_stream_key && s.restream_stream_key !== 'NOT_CONFIGURED')) {
            sellerDataList = sellersByEmail;
          }
        }
      }

      if (sellerDataList && sellerDataList.length > 0) {
        sellerData = sellerDataList.find((s: any) => s.restream_stream_key && 
                                             s.restream_stream_key !== 'NOT_CONFIGURED' && 
                                             s.restream_stream_key.length > 10);
        if (!sellerData) {
          sellerData = sellerDataList[0];
        }
      }

      const isSeller = !!sellerData;
      const isAdmin = isAdminUser;

      if (!isSeller && !isAdmin) {
        setError('You do not have seller or admin access. Please complete onboarding first.');
        setIsLoading(false);
        return;
      }

      setSeller(sellerData);

      // Check Restream connection
      if (sellerData) {
        const hasValidStreamKey = sellerData.restream_stream_key && 
                                   sellerData.restream_stream_key !== 'NOT_CONFIGURED' && 
                                   sellerData.restream_stream_key.length > 10;
        setRestreamConnected(hasValidStreamKey);
      }

      // Only fetch seller-specific data if seller exists
      if (sellerData) {
        // Get active/live stream
        const { data: activeData } = await dbClient
          .from('stream_sessions')
          .select('*')
          .eq('seller_id', sellerData.id)
          .eq('status', 'live')
          .maybeSingle();

        setActiveStream(activeData);

        // Get upcoming streams
        const { data: upcomingData } = await dbClient
          .from('stream_sessions')
          .select('*')
          .eq('seller_id', sellerData.id)
          .eq('status', 'scheduled')
          .gte('scheduled_start', new Date().toISOString())
          .order('scheduled_start', { ascending: true })
          .limit(5);

        setUpcomingStreams(upcomingData || []);

        // Get past streams
        const { data: pastData } = await dbClient
          .from('stream_sessions')
          .select('*')
          .eq('seller_id', sellerData.id)
          .in('status', ['ended', 'cancelled'])
          .order('actual_end', { ascending: false })
          .limit(5);

        setPastStreams(pastData || []);
      }
    } catch (err: any) {
      console.error('Error loading streaming data:', err);
      setError(err?.message || 'Failed to load data. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const startStream = async (sessionId: string) => {
    try {
      setIsLoading(true);

      // Call API to start stream on Restream
      const response = await fetch('/api/streaming/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId: sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start stream');
      }

      // Store OBS config for display
      if (data.obsConfig) {
        setObsConfig(data.obsConfig);
      }

      await loadStreamingData();
    } catch (error: any) {
      console.error('Error starting stream:', error);
      setError(error.message || 'Failed to start stream');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantGoLive = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get default platforms (all connected platforms)
      const defaultPlatforms = ['tiktok', 'youtube', 'facebook', 'instagram'];

      // Call instant live API
      const response = await fetch('/api/streaming/instant-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: defaultPlatforms,
          title: 'Instant Live Stream',
          selectedProducts: []
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start instant stream');
      }

      // Store OBS config for display
      if (data.obsConfig) {
        setObsConfig(data.obsConfig);
      }

      // Try to open OBS automatically
      try {
        await openOBSWithConfig(data.obsConfig);
      } catch (obsError) {
        console.log('OBS auto-open failed, user will need to configure manually');
      }

      // Reload streaming data to show active stream
      await loadStreamingData();

      // Show success message
      if (data.warning) {
        setError(data.warning);
      }
    } catch (error: any) {
      console.error('Error starting instant stream:', error);
      setError(error.message || 'Failed to start instant stream');
    } finally {
      setIsLoading(false);
    }
  };

  const openOBSWithConfig = async (obsSettings: { server: string; streamKey: string }) => {
    // Method 1: Try OBS protocol handler
    try {
      const obsProtocol = `obs://start?server=${encodeURIComponent(obsSettings.server)}&key=${encodeURIComponent(obsSettings.streamKey)}`;
      
      const link = document.createElement('a');
      link.href = obsProtocol;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Check if OBS opened after 2 seconds
      setTimeout(() => {
        if (!document.hidden) {
          // Method 2: Try to open OBS executable
          openOBSExecutable(obsSettings);
        }
      }, 2000);

    } catch (error) {
      console.log('OBS protocol failed, trying executable');
      openOBSExecutable(obsSettings);
    }
  };

  const openOBSExecutable = async (obsSettings: { server: string; streamKey: string }) => {
    try {
      // Method 2: Try to launch OBS using common paths
      const obsPaths = [
        'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe',
        'C:\\Program Files\\obs-studio\\bin\\32bit\\obs32.exe',
        'C:\\Program Files (x86)\\obs-studio\\bin\\64bit\\obs64.exe',
        'C:\\Program Files (x86)\\obs-studio\\bin\\32bit\\obs32.exe'
      ];

      for (const path of obsPaths) {
        try {
          // Try to launch OBS with configuration
          const response = await fetch('/api/obs/launch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              obsPath: path,
              server: obsSettings.server,
              streamKey: obsSettings.streamKey
            })
          });

          if (response.ok) {
            console.log('OBS launched successfully');
            return;
          }
        } catch (err) {
          continue;
        }
      }

      // Method 3: Show manual instructions with copy functionality
      showManualOBSInstructions(obsSettings);

    } catch (error) {
      console.log('All OBS launch methods failed, showing manual instructions');
      showManualOBSInstructions(obsSettings);
    }
  };

  const showManualOBSInstructions = (obsSettings: { server: string; streamKey: string }) => {
    const instructions = `
OBS MANUAL SETUP INSTRUCTIONS:

1. Open OBS Studio
2. Go to Settings → Stream
3. Service: Custom
4. Server: ${obsSettings.server}
5. Stream Key: ${obsSettings.streamKey}
6. Click "Start Streaming"

Would you like to copy the configuration to clipboard?
    `;

    if (confirm(instructions)) {
      // Copy server to clipboard
      navigator.clipboard.writeText(`Server: ${obsSettings.server}\nStream Key: ${obsSettings.streamKey}`);
      alert('Configuration copied to clipboard! Paste it in OBS Settings → Stream');
    }
  };

  const endStream = async (sessionId: string) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/streaming/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId: sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to end stream');
      }

      setObsConfig(null);
      await loadStreamingData();
    } catch (error: any) {
      console.error('Error ending stream:', error);
      setError(error.message || 'Failed to end stream');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDuration = (start: string, end?: string) => {
    // Only calculate duration if there's an actual active stream
    if (!start) return '0m';
    
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const minutes = Math.floor((endTime - startTime) / 60000);
    
    // Don't show duration if it's unrealistic (more than 24 hours for a single stream)
    if (minutes > 1440) return '0m';
    
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

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
                  <CardDescription className="text-red-600">
                    Started {formatDuration(activeStream.actual_start || activeStream.scheduled_start || '')} ago
                  </CardDescription>
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Stream active • Auto-updating every 10s
                  </p>
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
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 font-medium">Current Viewers</p>
                <p className="text-xl font-bold text-gray-900">{activeStream.total_viewers.toLocaleString()}</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 font-medium">Peak Viewers</p>
                <p className="text-xl font-bold text-gray-900">{activeStream.peak_viewers.toLocaleString()}</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 font-medium">Sales</p>
                <p className="text-xl font-bold text-green-600">${activeStream.total_sales.toLocaleString()}</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="text-xs text-gray-600 font-medium">Duration</p>
                <p className="text-xl font-bold text-gray-900">{formatDuration(activeStream.actual_start || '')}</p>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap mb-4">
              {activeStream.platforms.map((platform) => (
                <Badge key={platform} variant="secondary" className="capitalize bg-gray-800 text-white border-gray-600">
                  {platform}
                </Badge>
              ))}
            </div>

            {/* Live Video Preview */}
            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Live Stream Preview
                </h4>
                <a 
                  href="https://restream.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline"
                >
                  Open in Restream →
                </a>
              </div>
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative overflow-hidden">
                {seller?.restream_stream_key ? (
                  <iframe
                    src={`https://restream.io/embed?streamKey=${seller.restream_stream_key}`}
                    className="w-full h-full"
                    allowFullScreen
                    title="Live Stream Preview"
                    onError={() => console.log('Video preview failed to load')}
                  />
                ) : (
                  <div className="text-center text-white p-8">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-sm text-gray-300">Stream key not configured</p>
                    <p className="text-xs text-gray-400 mt-2">
                      <Link href="/seller/streaming/setup" className="text-blue-400 hover:underline">
                        Configure Restream to see preview
                      </Link>
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-2">
                <p className="text-xs text-gray-400 flex-1">
                  Preview may take 10-20 seconds to load after you start streaming in OBS.
                </p>
                <a 
                  href={`https://restream.io`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  View Full Dashboard
                </a>
              </div>
            </div>

            {/* OBS Configuration */}
            {(obsConfig || activeStream.metadata?.rtmp_url || seller?.restream_stream_key) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  OBS Studio Configuration
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-blue-700">Server (RTMP URL)</label>
                    <div className="flex gap-2 mt-1">
                      <code className="flex-1 bg-white p-2 rounded text-sm font-mono text-gray-800 overflow-x-auto">
                        {obsConfig?.server || activeStream.metadata?.rtmp_url || 'rtmp://live.restream.io/live'}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(obsConfig?.server || activeStream.metadata?.rtmp_url || 'rtmp://live.restream.io/live', 'server')}
                      >
                        {copiedField === 'server' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-blue-700">Stream Key</label>
                    <div className="flex gap-2 mt-1">
                      <code className="flex-1 bg-white p-2 rounded text-sm font-mono text-gray-800 overflow-x-auto">
                        {obsConfig?.streamKey || activeStream.metadata?.stream_key || seller?.restream_stream_key || 'Not configured - Go to Setup'}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!obsConfig?.streamKey && !activeStream.metadata?.stream_key && !seller?.restream_stream_key}
                        onClick={() => copyToClipboard(obsConfig?.streamKey || activeStream.metadata?.stream_key || seller?.restream_stream_key || '', 'key')}
                      >
                        {copiedField === 'key' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  {!seller?.restream_stream_key && (
                    <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mt-3">
                      <p className="text-xs text-yellow-800 font-medium mb-2">
                        ⚠️ Stream Key not configured!
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push('/seller/streaming/setup')}
                        className="text-xs"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Go to Setup
                      </Button>
                    </div>
                  )}
                  <div className="text-xs text-blue-600 mt-2">
                    <p className="font-medium">Instructions:</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Open OBS Studio</li>
                      <li>Go to Settings → Stream</li>
                      <li>Service: Custom</li>
                      <li>Server: Copy the RTMP URL above</li>
                      <li>Stream Key: Copy the key above</li>
                      <li>Click Start Streaming in OBS</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
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
                <Button onClick={() => router.push('/seller/schedule')}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Show
                </Button>
                <Button variant="outline" onClick={() => router.push('/seller/streaming/setup')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Setup Guide
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Link href="/seller/schedule" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-3">
              <Calendar className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">Schedule Show</CardTitle>
              <CardDescription>Plan your upcoming live streams</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
          <CardHeader className="pb-3">
            <Video className="w-8 h-8 text-red-600 mb-2" />
            <CardTitle className="text-lg">Go Live Now</CardTitle>
            <CardDescription>Start instant multi-platform stream</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {restreamConnected ? (
              <>
                <Button 
                  onClick={handleInstantGoLive}
                  className="w-full btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Go Live Instantly
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  💡 Stream will be created instantly. Configure Restream for multi-platform streaming.
                </p>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => router.push('/seller/restream-setup')}
                  className="w-full btn-secondary"
                  disabled={isLoading}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Setup Restream First
                </Button>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  ⚠️ Restream connection required for live streaming
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Link href="/seller/streaming/setup" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-3">
              <Settings className="w-8 h-8 text-purple-600 mb-2" />
              <CardTitle className="text-lg">Restream Setup</CardTitle>
              <CardDescription>Configure multi-streaming</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/seller/platforms" className="block">
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
              <Button size="sm" variant="outline" onClick={() => router.push('/seller/schedule')}>
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
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-gray-900 dark:text-white">{stream.title}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Clock className="w-3 h-3" />
                        {formatDate(stream.scheduled_start || '')}
                        <span className="flex gap-1">
                          {stream.platforms.map((p) => (
                            <Badge key={p} variant="outline" className="text-xs capitalize border-gray-400 text-gray-700 dark:text-gray-200">
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
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-gray-900 dark:text-white">{stream.title}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
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
                          className="text-xs border-gray-400 text-gray-700 dark:text-gray-200"
                        >
                          {stream.status}
                        </Badge>
                      </div>
                    </div>
                    {stream.status === 'ended' && (
                      <Button size="sm" variant="ghost" onClick={() => router.push(`/seller/schedule?duplicate=${stream.id}`)}>
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

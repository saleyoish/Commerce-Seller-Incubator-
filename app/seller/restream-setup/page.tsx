'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Video, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

function RestreamSetupContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [streamKey, setStreamKey] = useState('');
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectMode = searchParams.get('connect');

  // Define all functions first
  const checkConnectionStatus = async () => {
    try {
      setIsChecking(true);
      console.log('Starting checkConnectionStatus...');
      const response = await fetch('/api/seller/restream-status');
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Restream status check response:', data);
        
        // Simple connection check: valid stream key = connected
        const hasValidKey = data.streamKey && 
                            data.streamKey !== 'NOT_CONFIGURED' && 
                            data.streamKey.length > 10;
        
        console.log('hasValidKey:', hasValidKey, 'streamKey:', data.streamKey);
        
        if (hasValidKey && data.streamKey) {
          // Connected - set states and save to localStorage
          setIsConnected(true);
          setStreamKey(data.streamKey);
          localStorage.setItem('restream_connected', 'true');
          console.log('✅ Connected and saved to localStorage');
          
          // Launch OBS if in connect mode
          if (connectMode === 'true') {
            console.log('🚀 Launching OBS...');
            setTimeout(() => {
              const obsConfig = `obs://start?stream_key=${encodeURIComponent(data.streamKey)}&server=rtmp://live.restream.io/live&service=Restream.io`;
              window.location.href = obsConfig;
            }, 1000);
          }
        } else {
          // Not connected
          setIsConnected(false);
          localStorage.setItem('restream_connected', 'false');
          console.log('❌ Not connected');
        }
      } else {
        console.log('Response not ok:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
      setIsConnected(false);
      localStorage.setItem('restream_connected', 'false');
    } finally {
      setIsChecking(false);
      setIsLoading(false);
    }
  };

  const handleConnectRestream = () => {
    setShowConfigForm(true);
  };

  const handleSaveStreamKey = async () => {
    if (!streamKey.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/seller/update-restream-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamKey: streamKey.trim() })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Stream key saved:', data);
        setIsConnected(true);
        setShowConfigForm(false);
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save stream key');
      }
    } catch (error) {
      console.error('Failed to save stream key:', error);
      alert('Failed to save stream key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipSetup = () => {
    router.push('/seller/streaming/instant-live');
  };

  const handleGoToInstantLive = () => {
    router.push('/seller/streaming/instant-live');
  };

  const handleGoToSchedule = () => {
    router.push('/seller/streaming/schedule');
  };

  // Then useEffect - check connection first
  useEffect(() => {
    checkConnectionStatus();
  }, []);
  
  // Simple redirect logic - only if connected and not in connect mode
  useEffect(() => {
    if (isConnected && !isChecking && !connectMode) {
      router.push('/seller/streaming/instant-live');
    }
  }, [isConnected, isChecking, connectMode, router]);
  
  // No need to show form - we're going directly to streaming

  // Show loading state while checking connection
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Checking connection status...</p>
        </div>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="mb-8 bg-[var(--bg-surface)] border-[var(--border-default)]">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl text-[var(--text-primary)]">Restream Connected!</CardTitle>
              <CardDescription className="text-[var(--text-secondary)]">
                Your Restream account is already connected and ready to use.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-green-400 mb-2">✅ Connection Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-[var(--text-secondary)]">Restream account connected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-[var(--text-secondary)]">Streaming enabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-[var(--text-secondary)]">Multi-platform ready</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => router.push('/seller/streaming/instant-live')}
                  className="h-16 flex items-center justify-start gap-3"
                  size="lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                      <Video className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">🔴 Instant Live</div>
                      <div className="text-xs opacity-90">Start streaming immediately</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>

                <Button
                  onClick={() => router.push('/seller/streaming/schedule')}
                  variant="outline"
                  className="h-16 flex items-center justify-start gap-3 border-[var(--border-default)]"
                  size="lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">📅 Schedule Live</div>
                      <div className="text-xs opacity-90">Plan future streams</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </div>

              <div className="bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-lg p-4">
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">💡 Next Steps</h4>
                <ul className="text-sm text-[var(--text-secondary)] space-y-2 list-disc list-inside">
                  <li>Click "Instant Live" to start streaming immediately</li>
                  <li>OBS will open automatically with your settings</li>
                  <li>Click "Start Streaming" in OBS to go live</li>
                  <li>Your stream will appear on all connected platforms</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] py-12">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="mb-8 bg-[var(--bg-surface)] border-[var(--border-default)]">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-blue-500" />
            </div>
            <CardTitle className="text-2xl text-[var(--text-primary)]">Connect Restream</CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              Connect your Restream account to enable multi-platform streaming
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Why Restream?
              </h3>
              <ul className="text-sm text-[var(--text-secondary)] space-y-2 list-disc list-inside">
                <li>🎥 Stream to multiple platforms simultaneously</li>
                <li>📱 Reach TikTok, YouTube, Facebook, and more</li>
                <li>📊 Centralized analytics and chat management</li>
                <li>⚡ Professional streaming quality</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--bg-raised)] rounded-lg p-4 border border-[var(--border-default)]">
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">🎯 Features</h4>
                <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                  <li>• Multi-platform streaming</li>
                  <li>• Real-time analytics</li>
                  <li>• Chat management</li>
                  <li>• Recording options</li>
                </ul>
              </div>
              <div className="bg-[var(--bg-raised)] rounded-lg p-4 border border-[var(--border-default)]">
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">🚀 Benefits</h4>
                <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                  <li>• Wider audience reach</li>
                  <li>• Increased engagement</li>
                  <li>• Better monetization</li>
                  <li>• Professional setup</li>
                </ul>
              </div>
            </div>

            {!showConfigForm ? (
              <>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={handleConnectRestream}
                    disabled={isLoading}
                    className="flex-1"
                    size="lg"
                  >
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Enter Restream Key
                    </>
                  </Button>

                  <Button
                    onClick={handleSkipSetup}
                    variant="outline"
                    className="flex-1 border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]"
                    size="lg"
                  >
                    Skip for Now
                  </Button>
                </div>

                <div className="text-center text-sm text-[var(--text-muted)]">
                  <p>You can always connect Restream later from your dashboard settings.</p>
                </div>
              </>
            ) : (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 space-y-4">
                <h4 className="font-semibold text-blue-400">Enter Your Restream Stream Key</h4>
                
                <div className="space-y-2">
                  <label className="text-sm text-blue-300 font-medium flex items-center gap-2">
                    Stream Key
                    {streamKey && streamKey !== 'NOT_CONFIGURED' && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                        ✓ Fetched from account
                      </span>
                    )}
                  </label>
                  <Input
                    placeholder="re_xxxxxxxx..."
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                    className={`bg-[var(--bg-raised)] border-[var(--border-default)] text-[var(--text-primary)] ${
                      streamKey && streamKey !== 'NOT_CONFIGURED' ? 'border-green-500/50' : ''
                    }`}
                  />
                  <p className="text-xs text-blue-400">
                    {streamKey && streamKey !== 'NOT_CONFIGURED' 
                      ? 'Your existing stream key has been loaded. You can update it or continue as is.'
                      : 'Find this in your Restream dashboard under Settings → Stream Settings'
                    }
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveStreamKey}
                    disabled={isLoading || !streamKey.trim()}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save & Continue
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowConfigForm(false)}
                    variant="outline"
                    className="border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="pt-2 border-t border-blue-500/30">
                  <p className="text-xs text-blue-300">
                    <strong>How to get your stream key:</strong>
                  </p>
                  <ol className="text-xs text-blue-400 list-decimal list-inside space-y-1 mt-1">
                    <li>Go to <a href="https://restream.io" target="_blank" className="underline hover:text-blue-300">restream.io</a> and sign in</li>
                    <li>Click Settings in the left sidebar</li>
                    <li>Go to Stream Settings</li>
                    <li>Copy your Stream Key</li>
                    <li>Paste it above and click Save</li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RestreamSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-base)] py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    }>
      <RestreamSetupContent />
    </Suspense>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Radio,
  Copy,
  Check,
  MonitorPlay,
  Download,
  ChevronRight,
  AlertCircle,
  Settings,
  ArrowRight,
  X,
  ExternalLink
} from 'lucide-react';
import { ProductSelector } from '@/components/streaming/ProductSelector';
import { createClientSideSupabase } from '@/lib/supabase-client';

export default function InstantLivePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [streamKey, setStreamKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamSession, setStreamSession] = useState<any>(null);
  const [showOBSPopup, setShowOBSPopup] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<any[]>([]);

  useEffect(() => {
    checkRestreamStatus();
  }, []);

  useEffect(() => {
    if (isConnected && !isLoading) {
      // Automatically open OBS when connected
      handleOpenOBS();
    }
  }, [isConnected, isLoading]);

  const checkRestreamStatus = async () => {
    try {
      const response = await fetch('/api/streaming/instant-live', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setIsConnected(true);
        setStreamKey(data.streamKey);
      } else {
        // Fallback to restream-status if instant-live fails
        const fallbackResponse = await fetch('/api/seller/restream-status');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setIsConnected(fallbackData.connected);
          setStreamKey(fallbackData.streamKey);
        }
      }
    } catch (error) {
      console.error('Failed to check Restream status:', error);
      // Try fallback
      try {
        const fallbackResponse = await fetch('/api/seller/restream-status');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setIsConnected(fallbackData.connected);
          setStreamKey(fallbackData.streamKey);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchLinkedProducts = async (productIds: string[]) => {
    try {
      const supabase = await createClientSideSupabase();
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);
      
      setLinkedProducts(products || []);
    } catch (error) {
      console.error('Failed to fetch linked products:', error);
    }
  };

  const handleOpenOBS = async () => {
    if (!streamKey || streamKey === 'NOT_CONFIGURED') {
      alert('Please configure your Restream stream key first');
      return;
    }

    try {
      // Start stream session
      const response = await fetch('/api/streaming/instant-live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platforms: ['restream'],
          title: 'Instant Live Stream',
          selectedProducts: selectedProducts
        })
      });

      if (response.ok) {
        const data = await response.json();
        setStreamSession(data.streamSession);
        setIsStreaming(true);
        
        // Fetch linked products details
        if (data.streamSession?.products_featured && data.streamSession.products_featured.length > 0) {
          await fetchLinkedProducts(data.streamSession.products_featured);
        }
        
        // Show OBS setup popup instead of auto-launching
        setShowOBSPopup(true);
      } else {
        const errorData = await response.json();
        alert(`Failed to start stream: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to start stream:', error);
      alert('Failed to start stream. Please try again.');
    }
  };

  const handleStopStream = async () => {
    if (!streamSession) return;

    try {
      const response = await fetch('/api/streaming/instant-live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'stop_stream',
          streamKey: streamKey
        })
      });

      if (response.ok) {
        setIsStreaming(false);
        setStreamSession(null);
        alert('Stream stopped successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to stop stream: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to stop stream:', error);
      alert('Failed to stop stream. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="bg-[var(--bg-surface)] border-[var(--border-default)]">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
              <CardTitle className="text-2xl text-[var(--text-primary)]">Restream Not Connected</CardTitle>
              <CardDescription className="text-[var(--text-secondary)]">
                You need to connect your Restream account before going live
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-400 mb-2">⚠️ Setup Required</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  To start streaming, you need to connect your Restream account and configure your stream settings.
                </p>
              </div>

              <Link href="/seller/streaming/setup">
                <Button className="w-full h-14">
                  <Settings className="w-5 h-5 mr-2" />
                  Connect Restream Account
                  <ArrowRight className="w-5 h-5 ml-auto" />
                </Button>
              </Link>

              <div className="bg-[var(--bg-raised)] rounded-lg p-4 border border-[var(--border-default)]">
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Why connect Restream?</h4>
                <ul className="text-sm text-[var(--text-secondary)] space-y-2 list-disc list-inside">
                  <li>Stream to multiple platforms (TikTok, YouTube, Facebook)</li>
                  <li>Centralized chat and analytics</li>
                  <li>Professional streaming quality</li>
                  <li>One-click streaming setup</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">🔴 Instant Go Live</h1>
          <p className="text-[var(--text-secondary)]">Start streaming to multiple platforms instantly</p>
        </div>

        {/* Stream Status Card */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <Radio className="w-5 h-5 text-[var(--accent-primary)]" />
              Stream Status
            </CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              Your current streaming configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-[var(--bg-raised)] rounded-lg border border-[var(--border-default)]">
                <p className="text-sm text-[var(--text-muted)] mb-1">Restream Status</p>
                <p className="font-medium text-[var(--accent-primary)]">
                  Connected
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Ready to stream
                </p>
              </div>
              <div className="p-4 bg-[var(--bg-raised)] rounded-lg border border-[var(--border-default)]">
                <p className="text-sm text-[var(--text-muted)] mb-1">Connected Platforms</p>
                <p className="font-medium text-[var(--text-primary)]">
                  1+
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Restream.io connected
                </p>
              </div>
              <div className="p-4 bg-[var(--bg-raised)] rounded-lg border border-[var(--border-default)]">
                <p className="text-sm text-[var(--text-muted)] mb-1">OBS Status</p>
                <p className="font-medium text-[var(--text-primary)]">
                  Auto-Launch
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Opens automatically
                </p>
              </div>
            </div>

            {/* Streaming Status */}
            {isStreaming && streamSession && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <div>
                      <h3 className="font-semibold text-red-400">🔴 LIVE NOW</h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        Streaming to Restream.io • Session ID: {streamSession.id}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleStopStream}
                    variant="destructive"
                    size="sm"
                  >
                    ⏹️ End Stream
                  </Button>
                </div>
              </div>
            )}

            {/* Product Selection */}
            <div className="mb-6">
              <ProductSelector
                selectedProducts={selectedProducts}
                onSelectionChange={setSelectedProducts}
                maxProducts={10}
              />
            </div>

            {/* Linked Products Display */}
            {isStreaming && linkedProducts.length > 0 && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h4 className="font-semibold text-green-300 mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Products Linked to Stream ({linkedProducts.length})
                </h4>
                <div className="space-y-2">
                  {linkedProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-3 bg-[var(--bg-base)] p-3 rounded">
                      {product.images && product.images.length > 0 && (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-primary)]">{product.name}</p>
                        <p className="text-sm text-[var(--text-muted)]">${product.price}</p>
                      </div>
                      <Badge className="bg-green-500 text-white">
                        Linked
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Launch */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleOpenOBS}
                disabled={isStreaming}
                className={`flex-1 h-14 text-lg font-semibold ${
                  isStreaming 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                }`}
              >
                <MonitorPlay className="w-6 h-6 mr-3" />
                {isStreaming ? '🔴 Streaming Active' : '🚀 Launch OBS & Start Streaming'}
              </Button>

              <Button
                onClick={() => window.open('https://obsproject.com/download', '_blank')}
                variant="outline"
                className="h-14 border-[var(--border-default)]"
              >
                <Download className="w-5 h-5 mr-2" />
                Download OBS
              </Button>
            </div>

            {/* Stream Key Reminder */}
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h4 className="font-semibold text-blue-300 mb-2">📋 Stream Key</h4>
              <div className="flex items-center gap-2 mb-2">
                <code className="flex-1 bg-[var(--bg-base)] p-2 rounded text-sm font-mono text-[var(--text-primary)] break-all">
                  {streamKey || 'Loading...'}
                </code>
                <Button
                  onClick={() => streamKey && copyToClipboard(streamKey)}
                  variant="ghost"
                  size="sm"
                  disabled={!streamKey}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Copy this key and paste it in OBS Settings → Stream → Custom Service
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Setup Reminder */}
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Quick Setup (One Time)</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">
              If you haven&apos;t set this up yet, complete these steps once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/seller/streaming/setup">
              <div className="flex items-center justify-between p-4 border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-raised)] transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                    <Radio className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Configure Restream.io</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Set up your stream key for multi-platform broadcasting
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* OBS Setup Popup */}
      {showOBSPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-default)]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-default)]">
              <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <MonitorPlay className="w-6 h-6 text-red-500" />
                OBS Setup Instructions
              </h2>
              <button
                onClick={() => setShowOBSPopup(false)}
                className="p-2 hover:bg-[var(--bg-raised)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Stream Key Display */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-blue-300 mb-3 flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Your Stream Key
                </h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[var(--bg-base)] p-3 rounded text-sm font-mono text-[var(--text-primary)] break-all">
                    {streamKey}
                  </code>
                  <Button
                    onClick={() => {
                      if (streamKey) {
                        navigator.clipboard.writeText(streamKey);
                        alert('Stream key copied!');
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Step-by-step Instructions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-[var(--text-primary)]">📋 Follow These Steps:</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">1</div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">Open OBS Studio</p>
                      <p className="text-sm text-[var(--text-secondary)]">Launch OBS Studio on your computer</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">2</div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">Go to Stream Settings</p>
                      <p className="text-sm text-[var(--text-secondary)]">Click <strong>Settings → Stream</strong> in OBS</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">3</div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">Configure Stream Settings</p>
                      <div className="mt-2 space-y-2">
                        <div className="bg-[var(--bg-raised)] p-3 rounded border border-[var(--border-default)]">
                          <p className="text-sm font-mono text-[var(--text-secondary)]">
                            <strong>Service:</strong> Custom<br />
                            <strong>Server:</strong> rtmp://live.restream.io/live<br />
                            <strong>Stream Key:</strong> [Your copied key above]
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">4</div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">Start Streaming</p>
                      <p className="text-sm text-[var(--text-secondary)]">Click "Start Streaming" in OBS to go live!</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3 pt-4 border-t border-[var(--border-default)]">
                <Button
                  onClick={() => setShowOBSPopup(false)}
                  className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  ✅ I've Set Up OBS
                </Button>
                <Button
                  onClick={() => window.open('https://obsproject.com/download', '_blank')}
                  variant="outline"
                  className="border-[var(--border-default)]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download OBS
                </Button>
              </div>

              {/* Note */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-sm text-yellow-300">
                  <strong>💡 Note:</strong> Your stream session is already created. Once you start streaming in OBS, your analytics will be automatically saved to the dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

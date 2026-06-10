'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';
import { OBSModal } from './OBSModal';
import { useOBSIntegration } from '@/hooks/useOBSIntegration-new';
import { useStreamStatus } from '@/hooks/useStreamStatus-new';
import { StreamSession, OBSConfig } from '@/types/streaming';
import { 
  Video, 
  Loader2, 
  Plus, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface InstantLiveButtonProps {
  sellerId: string;
  onStreamCreated?: (streamSession: StreamSession) => void;
}

export function InstantLiveButton({ sellerId, onStreamCreated }: InstantLiveButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [showOBSModal, setShowOBSModal] = useState(false);
  const [streamSession, setStreamSession] = useState<StreamSession | null>(null);
  const [obsConfig, setObsConfig] = useState<OBSConfig | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  const { streamStatus, isLoading: statusLoading } = useStreamStatus(sellerId);
  const { openOBS, detectObsPath, isOpening: obsOpening } = useOBSIntegration();

  // Auto-detect OBS path on mount
  useEffect(() => {
    detectObsPath();
  }, []);

  const handleInstantLive = async () => {
    if (streamStatus) {
      // Show OBS modal for existing stream
      setShowOBSModal(true);
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/streaming/instant-live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platforms: ['youtube', 'facebook', 'tiktok'],
          selectedProducts: selectedProducts,
          title: 'Live Stream - TikTok Shop'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create stream');
      }

      const data = await response.json();
      setStreamSession(data.streamSession);
      setObsConfig(data.obsConfig);
      
      if (onStreamCreated) {
        onStreamCreated(data.streamSession);
      }

      // Show OBS modal immediately after creating stream
      setShowOBSModal(true);

    } catch (error) {
      console.error('Failed to create instant live stream:', error);
      alert(error instanceof Error ? error.message : 'Failed to create stream');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenOBS = async (obsPath: string) => {
    if (!obsConfig || !streamSession) return;

    const success = await openOBS(obsPath, {
      server: obsConfig.server,
      stream_key: obsConfig.stream_key,
      bitrate: obsConfig.bitrate,
      fps: obsConfig.fps,
      resolution: obsConfig.resolution
    });

    if (success) {
      console.log('OBS launched successfully');
    }
  };

  const getButtonState = () => {
    if (statusLoading) return { text: 'Loading...', disabled: true, variant: 'secondary' as const };
    if (streamStatus?.status === 'live') return { text: '🔴 LIVE NOW', disabled: true, variant: 'destructive' as const };
    if (streamStatus?.status === 'pending') return { text: '⏳ Starting...', disabled: true, variant: 'secondary' as const };
    if (isCreating) return { text: 'Creating...', disabled: true, variant: 'secondary' as const };
    if (obsOpening) return { text: 'Opening OBS...', disabled: true, variant: 'secondary' as const };
    return { text: '🎥 Instant Live', disabled: false, variant: 'default' as const };
  };

  const buttonState = getButtonState();

  return (
    <>
      <div className="space-y-4">
        {/* Main Instant Live Button */}
        <Button
          onClick={handleInstantLive}
          disabled={buttonState.disabled}
          variant={buttonState.variant}
          size="lg"
          className="w-full"
        >
          {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {streamStatus?.status === 'live' && <Video className="w-4 h-4 mr-2" />}
          {streamStatus?.status === 'pending' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {buttonState.text}
        </Button>

        {/* Status Indicator */}
        {streamStatus && (
          <div className="flex items-center justify-center p-4 border rounded-lg">
            {streamStatus.status === 'live' ? (
              <div className="flex items-center gap-2 text-red-600">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="font-semibold">🔴 Stream is LIVE</span>
                <Badge variant="destructive">LIVE</Badge>
              </div>
            ) : streamStatus.status === 'pending' ? (
              <div className="flex items-center gap-2 text-yellow-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-semibold">⏳ Starting stream...</span>
                <Badge variant="secondary">PENDING</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-600">
                <AlertCircle className="w-4 h-4" />
                <span className="font-semibold">Ready to stream</span>
                <Badge variant="outline">READY</Badge>
              </div>
            )}
          </div>
        )}

        {/* Stream Info */}
        {streamSession && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Stream Information</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p><strong>Title:</strong> {streamSession.title}</p>
              <p><strong>Status:</strong> {streamSession.status}</p>
              <p><strong>Platforms:</strong> {streamSession.platforms.join(', ')}</p>
              {streamSession.products_featured && streamSession.products_featured.length > 0 && (
                <p><strong>Products:</strong> {streamSession.products_featured.length} selected</p>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!streamStatus && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              How to Start Streaming
            </h3>
            <ol className="text-sm text-green-800 space-y-2 list-decimal list-inside">
              <li>Click "🎥 Instant Live" button above</li>
              <li>OBS will open automatically on your laptop</li>
              <li>Configure stream settings in OBS (RTMP server and stream key)</li>
              <li>Click "Start Streaming" in OBS</li>
              <li>Your stream will go live automatically on all platforms</li>
              <li>Add product links to your stream description</li>
            </ol>
          </div>
        )}
      </div>

      {/* OBS Configuration Modal */}
      <Dialog open={showOBSModal} onOpenChange={setShowOBSModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Stream Configuration - OBS Setup</DialogTitle>
          </DialogHeader>
          {streamSession && obsConfig && (
            <OBSModal
              isOpen={showOBSModal}
              onClose={() => setShowOBSModal(false)}
              streamSession={streamSession}
              obsConfig={obsConfig}
              onOpenOBS={handleOpenOBS}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

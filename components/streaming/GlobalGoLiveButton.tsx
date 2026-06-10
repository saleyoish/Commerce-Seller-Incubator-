'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';
import { 
  Calendar, 
  Video, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GlobalGoLiveButtonProps {
  sellerId?: string;
  children: React.ReactNode;
}

export function GlobalGoLiveButton({ children }: GlobalGoLiveButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [restreamConnected, setRestreamConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const router = useRouter();

  // Check database and redirect immediately if already connected
  const handleGoLiveClick = async () => {
    try {
      setIsLoading(true);
      setStatusError(null);
      
      const response = await fetch('/api/seller/restream-status');
      if (response.ok) {
        const data = await response.json();
        
        // Check if user has a valid stream key (connected)
        const hasValidKey = data.streamKey && 
                            data.streamKey !== 'NOT_CONFIGURED' && 
                            data.streamKey.length > 5;
        
        if (data.connected || hasValidKey) {
          // User already connected - go directly to instant live
          console.log('Stream key found, redirecting to instant live...');
          router.push('/seller/streaming/instant-live');
          return;
        } else {
          // No connection - show the dialog with options
          setRestreamConnected(false);
          setIsOpen(true);
        }
      } else {
        // Error checking status - show dialog anyway
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Failed to check Restream status:', error);
      // Error - show dialog
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantLive = () => {
    setIsOpen(false);
    
    if (restreamConnected) {
      // Direct to streaming page if already connected
      router.push('/seller/streaming/instant-live');
    } else {
      // Show Restream setup for first-time users
      router.push('/seller/restream-setup?connect=true');
    }
  };

  const handleScheduleLive = () => {
    setIsOpen(false);
    
    if (restreamConnected) {
      // Direct to scheduling page if already connected
      router.push('/seller/streaming/schedule');
    } else {
      // Show Restream setup for first-time users
      router.push('/seller/restream-setup?connect=true');
    }
  };

  return (
    <>
      {/* Clickable wrapper that checks database first */}
      <div 
        onClick={handleGoLiveClick} 
        className={`cursor-pointer inline-block ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
        role="button"
        tabIndex={0}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Checking...</span>
          </div>
        ) : (
          children
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Start Streaming
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-2">
          {statusError && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4">
              <p className="text-sm text-destructive mb-3">{statusError}</p>
              {statusError.includes('seller registration') && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/seller');
                  }}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              )}
            </div>
          )}

          {/* Status Indicator */}
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Checking connection status...</p>
            </div>
          ) : (
            restreamConnected && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Restream connected</span>
                </div>
              </div>
            )
          )}

          {/* Instant Live Option */}
          <Button
            onClick={handleInstantLive}
            variant="default"
            size="lg"
            className="w-full h-16 flex items-center justify-start gap-3"
            disabled={isLoading}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold">🔴 Instant Go Live</div>
                <div className="text-xs text-gray-500">
                  {restreamConnected ? 'Start streaming immediately' : 'Connect Restream and start streaming'}
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>

          {/* Schedule Live Option */}
          <Button
            onClick={handleScheduleLive}
            variant="outline"
            size="lg"
            className="w-full h-16 flex items-center justify-start gap-3"
            disabled={isLoading}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold">📅 Schedule Live</div>
                <div className="text-xs text-gray-500">
                  {restreamConnected ? 'Plan for future stream' : 'Connect Restream and schedule streams'}
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>

          {/* Help Text */}
          {!restreamConnected && !isLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">First Time Setup</h4>
              <p className="text-sm text-blue-800">
                Connect your Restream account to start streaming. You'll only need to do this once!
              </p>
            </div>
          )}

          {/* Quick Stats */}
          {restreamConnected && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Quick Stats</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">12</div>
                  <div className="text-xs text-gray-500">Total Streams</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">3.2K</div>
                  <div className="text-xs text-gray-500">Total Views</div>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">💡 Streaming Tips</h4>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>🔴 <strong>Instant Live:</strong> Start streaming immediately with OBS</li>
              <li>📅 <strong>Schedule Live:</strong> Plan streams for specific times</li>
              <li>📱 <strong>Multi-platform:</strong> Stream to TikTok, YouTube, Facebook</li>
              <li>💰 <strong>Product Links:</strong> Add products to earn during streams</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}

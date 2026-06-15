import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';
import { StreamSession } from '@/types/streaming';

export function useStreamStatus(sellerId: string) {
  const [streamStatus, setStreamStatus] = useState<StreamSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerId) return;

    let mounted = true;

    const loadCurrentStream = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await authFetch(
          `/api/seller/streams?status=pending,live&limit=1`,
          { credentials: 'omit' }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load stream');
        }

        if (mounted) {
          setStreamStatus(data.streams?.[0] ?? null);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          console.error('Failed to load current stream:', err);
          setError(err instanceof Error ? err.message : 'Failed to load stream');
          setIsLoading(false);
        }
      }
    };

    loadCurrentStream();

    return () => {
      mounted = false;
    };
  }, [sellerId]);

  // Helper functions
  const isLive = streamStatus?.status === 'live';
  const isPending = streamStatus?.status === 'pending';
  const isEnded = streamStatus?.status === 'ended';
  const isError = streamStatus?.status === 'error';
  
  const getStatusMessage = () => {
    if (!streamStatus) return null;
    
    switch (streamStatus.status) {
      case 'pending':
        return '⏳ Waiting for OBS connection...';
      case 'live':
        return '🔴 LIVE NOW';
      case 'ended':
        return '✅ Stream ended';
      case 'error':
        return '❌ Stream error';
      default:
        return streamStatus.status;
    }
  };

  const getStatusColor = () => {
    if (!streamStatus) return 'gray';
    
    switch (streamStatus.status) {
      case 'pending':
        return 'yellow';
      case 'live':
        return 'red';
      case 'ended':
        return 'green';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  return {
    streamStatus,
    isLoading,
    error,
    isLive,
    isPending,
    isEnded,
    isError,
    getStatusMessage,
    getStatusColor
  };
}

// Hook for OBS integration
export function useOBSIntegration() {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openOBS = async (obsPath: string, config?: any): Promise<boolean> => {
    try {
      setIsOpening(true);
      setError(null);

      const response = await fetch('/api/obs/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          obsPath,
          ...config
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to launch OBS');
      }

      const data = await response.json();
      console.log('OBS launched successfully:', data);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open OBS';
      setError(errorMessage);
      console.error('OBS launch error:', err);
      return false;
    } finally {
      setIsOpening(false);
    }
  };

  const detectObsPath = (): string => {
    // Try to detect OBS path based on platform
    const platform = navigator.platform.toLowerCase();
    
    if (platform.includes('win')) {
      return 'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe';
    } else if (platform.includes('mac')) {
      return '/Applications/OBS.app/Contents/MacOS/OBS';
    } else if (platform.includes('linux')) {
      return '/usr/bin/obs';
    }
    
    return '';
  };

  return {
    openOBS,
    detectObsPath,
    isOpening,
    error
  };
}

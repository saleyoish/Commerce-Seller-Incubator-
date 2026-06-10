import { useEffect, useState } from 'react';
import { createClientSideSupabase } from '@/lib/supabase-client';
import { StreamSession, StreamStatus } from '@/types/streaming';

export function useStreamStatus(sellerId: string) {
  const [streamStatus, setStreamStatus] = useState<StreamSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerId) return;

    const supabase = createClientSideSupabase();
    let mounted = true;
    
    // Initial load
    const loadCurrentStream = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase
          .from('stream_sessions')
          .select('*')
          .eq('seller_id', sellerId)
          .in('status', ['pending', 'live'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }
        
        if (mounted) {
          setStreamStatus(data);
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

    // Set up real-time subscription (optional - may fail with custom auth)
    let channel: any = null;
    try {
      channel = supabase
        .channel('stream_status_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'stream_sessions',
            filter: `seller_id=eq.${sellerId}`,
          },
          (payload) => {
            console.log('Stream status updated:', payload);
            
            if (payload.new && mounted) {
              const updatedStream = payload.new as StreamSession;
              
              // Only update if it's a relevant status change
              if (['pending', 'live', 'ended', 'error'].includes(updatedStream.status)) {
                setStreamStatus(updatedStream);
                
                // If stream ended, clear after delay
                if (updatedStream.status === 'ended') {
                  setTimeout(() => {
                    if (mounted) {
                      setStreamStatus(null);
                    }
                  }, 5000);
                }
                
                // If stream went to error, clear after longer delay
                if (updatedStream.status === 'error') {
                  setTimeout(() => {
                    if (mounted) {
                      setStreamStatus(null);
                    }
                  }, 10000);
                }
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to stream status updates');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('Realtime subscription failed (expected with custom auth)');
            if (mounted) {
              setError('Failed to subscribe to real-time updates');
            }
          } else if (status === 'TIMED_OUT') {
            console.warn('Realtime subscription timed out');
          }
        });
    } catch (error) {
      console.warn('Failed to setup realtime subscription:', error);
    }

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
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

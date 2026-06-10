import { useEffect, useState } from 'react';
import { createClientSideSupabase } from '@/lib/supabase-client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useStreamStatus(sellerId: string) {
  const [streamStatus, setStreamStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;

    const supabase = createClientSideSupabase();
    
    // Initial load
    const loadCurrentStream = async () => {
      const { data } = await supabase
        .from('stream_sessions')
        .select('*')
        .eq('seller_id', sellerId)
        .in('status', ['pending', 'live'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      setStreamStatus(data);
      setIsLoading(false);
    };

    loadCurrentStream();

    // Set up real-time subscription (optional - may fail with custom auth)
    let channel: RealtimeChannel | null = null;
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
            
            if (payload.new && ['pending', 'live', 'ended'].includes(payload.new.status)) {
              setStreamStatus(payload.new);
              
              // If stream ended, clear after 5 seconds
              if (payload.new.status === 'ended') {
                setTimeout(() => {
                  setStreamStatus(null);
                }, 5000);
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to stream status updates');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('Realtime subscription failed (expected with custom auth)');
          } else if (status === 'TIMED_OUT') {
            console.warn('Realtime subscription timed out');
          }
        });
    } catch (error) {
      console.warn('Failed to setup realtime subscription:', error);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [sellerId]);

  return { streamStatus, isLoading };
}

import { createAdminSupabase } from '@/lib/supabase-admin';
import { 
  StreamSession, 
  StreamStatus, 
  StreamType, 
  CreateStreamRequest,
  CreateStreamResponse,
  StreamStatusUpdate,
  OBSConfig,
  StreamMetadata
} from '@/types/streaming';
import { STREAMING_CONSTANTS as CONSTANTS } from '@/constants/streaming';

export class StreamingService {
  private supabase = createAdminSupabase();

  /**
   * Create a new stream session with proper validation and race condition prevention
   */
  async createStreamSession(
    sellerId: string,
    request: CreateStreamRequest
  ): Promise<CreateStreamResponse> {
    try {
      // Check for existing live streams (prevent duplicates)
      await this.validateNoActiveStreams(sellerId);

      // Create OBS configuration
      const obsConfig = await this.generateOBSConfig(sellerId);

      // Create stream session
      const streamSession = await this.createStreamRecord(sellerId, request, obsConfig);

      return {
        success: true,
        streamSession,
        obsConfig,
        platforms: request.platforms,
        warning: !obsConfig.stream_key || obsConfig.stream_key === 'NOT_CONFIGURED' 
          ? 'Restream not configured. Please setup Restream first.' 
          : undefined
      };

    } catch (error) {
      console.error('Failed to create stream session:', error);
      throw error;
    }
  }

  /**
   * Update stream status with proper validation and real-time triggers
   */
  async updateStreamStatus(
    sessionId: string,
    update: StreamStatusUpdate
  ): Promise<StreamSession> {
    try {
      const { data, error } = await this.supabase
        .from('stream_sessions')
        .update({
          ...update,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select('id, seller_id, title, description, type, status, platforms, products_featured, scheduled_start, actual_start, actual_end, restream_event_id, restream_stream_id, metadata, created_at, updated_at')
        .single();

      if (error) throw error;

      // Trigger real-time update
      await this.triggerRealtimeUpdate(sessionId, update.status);

      return data;

    } catch (error) {
      console.error('Failed to update stream status:', error);
      throw error;
    }
  }

  /**
   * Get current active stream for a seller
   */
  async getActiveStream(sellerId: string): Promise<StreamSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('stream_sessions')
        .select('*')
        .eq('seller_id', sellerId)
        .in('status', [StreamStatus.PENDING, StreamStatus.LIVE])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data;

    } catch (error) {
      console.error('Failed to get active stream:', error);
      return null;
    }
  }

  /**
   * End a stream session
   */
  async endStream(sessionId: string, reason?: string): Promise<void> {
    try {
      const update: StreamStatusUpdate = {
        status: StreamStatus.ENDED,
        actual_end: new Date().toISOString(),
        ended_at: new Date().toISOString()
      };

      if (reason) {
        update.metadata = {
          ended_reason: reason
        };
      }

      await this.updateStreamStatus(sessionId, update);

    } catch (error) {
      console.error('Failed to end stream:', error);
      throw error;
    }
  }

  /**
   * Validate that seller has no active streams (race condition prevention)
   */
  private async validateNoActiveStreams(sellerId: string): Promise<void> {
    const activeStream = await this.getActiveStream(sellerId);
    
    if (activeStream) {
      throw new Error(
        `Cannot create new stream. Already have an ${activeStream.status} stream: ${activeStream.id}`
      );
    }
  }

  /**
   * Generate OBS configuration for a seller
   */
  private async generateOBSConfig(sellerId: string): Promise<OBSConfig> {
    try {
      const { data: seller, error } = await this.supabase
        .from('sellers')
        .select('restream_stream_key, restream_username')
        .eq('id', sellerId)
        .single();

      if (error) throw error;

      return {
        server: CONSTANTS.RTMP.RESTREAM_SERVER,
        stream_key: seller?.restream_stream_key || 'NOT_CONFIGURED',
        backup_server: CONSTANTS.RTMP.BACKUP_SERVER,
        bitrate: CONSTANTS.RTMP.DEFAULT_BITRATE,
        fps: CONSTANTS.RTMP.DEFAULT_FPS,
        resolution: CONSTANTS.RTMP.DEFAULT_RESOLUTION
      };

    } catch (error) {
      console.error('Failed to generate OBS config:', error);
      throw error;
    }
  }

  /**
   * Create stream session record in database
   */
  private async createStreamRecord(
    sellerId: string,
    request: CreateStreamRequest,
    obsConfig: OBSConfig
  ): Promise<StreamSession> {
    const metadata: StreamMetadata = {
      instant: request.type === StreamType.INSTANT,
      obs_config: obsConfig,
      reconnect_attempts: 0,
      last_health_check: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('stream_sessions')
      .insert({
        seller_id: sellerId,
        title: request.title || 'Instant Live Stream',
        description: request.description || 'Instant multi-platform live stream',
        type: request.type,
        status: StreamStatus.PENDING,
        platforms: request.platforms,
        products_featured: request.selectedProducts || [],
        scheduled_start: request.scheduledStart || new Date().toISOString(),
        actual_start: null,
        actual_end: null,
        metadata
      })
      .select('id, seller_id, title, description, type, status, platforms, products_featured, scheduled_start, actual_start, actual_end, restream_event_id, restream_stream_id, metadata, created_at, updated_at')
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Trigger real-time update for connected clients
   */
  private async triggerRealtimeUpdate(sessionId: string, status: StreamStatus): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('stream_sessions')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Failed to trigger realtime update:', error);
      }
    } catch (error) {
      console.error('Error triggering realtime update:', error);
    }
  }

  /**
   * Log webhook event for debugging and analytics
   */
  async logWebhookEvent(
    eventType: string,
    streamSessionId: string | null,
    payload: any,
    processed: boolean = false,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('webhook_logs')
        .insert({
          event_type: eventType,
          stream_session_id: streamSessionId,
          payload,
          processed,
          error_message: errorMessage,
          retry_count: 0,
          created_at: new Date().toISOString()
        });

    } catch (error) {
      console.error('Failed to log webhook event:', error);
    }
  }

  /**
   * Get stream health metrics
   */
  async getStreamHealth(sessionId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('stream_health_checks')
        .select('*')
        .eq('stream_session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data;

    } catch (error) {
      console.error('Failed to get stream health:', error);
      return null;
    }
  }

  /**
   * Update stream health metrics
   */
  async updateStreamHealth(
    sessionId: string,
    metrics: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('stream_health_checks')
        .insert({
          stream_session_id: sessionId,
          status: metrics.status || 'healthy',
          last_heartbeat: new Date().toISOString(),
          bitrate: metrics.bitrate || 0,
          fps: metrics.fps || 0,
          dropped_frames: metrics.dropped_frames || 0,
          network_quality: metrics.network_quality || 100,
          cpu_usage: metrics.cpu_usage || 0,
          memory_usage: metrics.memory_usage || 0,
          created_at: new Date().toISOString()
        });

    } catch (error) {
      console.error('Failed to update stream health:', error);
    }
  }
}

// Export singleton instance
export const streamingService = new StreamingService();

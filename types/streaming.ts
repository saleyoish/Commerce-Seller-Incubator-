// Production-ready streaming types and enums

export enum StreamStatus {
  PENDING = 'pending',
  LIVE = 'live',
  ENDED = 'ended',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

export enum StreamType {
  INSTANT = 'instant',
  SCHEDULED = 'scheduled',
  AUTOMATED = 'automated'
}

export enum WebhookEventType {
  STREAM_STARTED = 'stream.started',
  STREAM_ENDED = 'stream.ended',
  STREAM_CREATED = 'stream.created',
  STREAM_UPDATED = 'stream.updated',
  STREAM_ERROR = 'stream.error'
}

export interface StreamSession {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  type: StreamType;
  status: StreamStatus;
  platforms: string[];
  products_featured: string[];
  scheduled_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  restream_event_id?: string;
  restream_stream_id?: string;
  metadata: StreamMetadata;
  created_at: string;
  updated_at: string;
  ended_at?: string;
}

export interface StreamMetadata {
  instant: boolean;
  obs_config: OBSConfig;
  webhook_received?: boolean;
  stream_started_at?: string;
  stream_ended_at?: string;
  duration_seconds?: number;
  current_viewers?: number;
  peak_viewers?: number;
  total_viewers?: number;
  bitrate?: number;
  fps?: number;
  reconnect_attempts?: number;
  last_health_check?: string;
  ended_reason?: string;
  error_details?: {
    code: string;
    message: string;
    timestamp: string;
  };
}

export interface OBSConfig {
  server: string;
  stream_key: string;
  backup_server?: string;
  bitrate?: number;
  fps?: number;
  resolution?: {
    width: number;
    height: number;
  };
}

export interface RestreamWebhookEvent {
  type: WebhookEventType;
  data: {
    id: string;
    streamId: string;
    title?: string;
    userId: string;
    platform?: string;
    startedAt?: string;
    endedAt?: string;
    status?: string;
    duration?: number;
    metrics?: StreamMetrics;
  };
  timestamp: string;
  signature?: string;
}

export interface StreamMetrics {
  currentViewers: number;
  peakViewers: number;
  totalViewers: number;
  bitrate: number;
  fps: number;
  platforms: PlatformMetrics[];
}

export interface PlatformMetrics {
  name: string;
  viewers: number;
  peakViewers: number;
  engagedUsers: number;
  salesCount: number;
  salesTotal: number;
}

export interface WebhookLog {
  id: string;
  event_type: WebhookEventType;
  stream_session_id?: string;
  payload: any;
  processed: boolean;
  error_message?: string;
  retry_count: number;
  created_at: string;
  processed_at?: string;
}

export interface StreamHealthCheck {
  id: string;
  stream_session_id: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  last_heartbeat: string;
  bitrate: number;
  fps: number;
  dropped_frames: number;
  network_quality: number;
  cpu_usage: number;
  memory_usage: number;
  created_at: string;
}

export interface CreateStreamRequest {
  title?: string;
  description?: string;
  platforms: string[];
  selectedProducts?: string[];
  type: StreamType;
  scheduledStart?: string;
}

export interface CreateStreamResponse {
  success: boolean;
  streamSession: StreamSession;
  obsConfig: OBSConfig;
  platforms: string[];
  warning?: string;
}

export interface StreamStatusUpdate {
  status: StreamStatus;
  actual_start?: string;
  actual_end?: string;
  ended_at?: string;
  metadata?: Partial<StreamMetadata>;
}

export interface OBSLaunchRequest {
  obsPath: string;
  server: string;
  streamKey: string;
  title?: string;
  config?: Partial<OBSConfig>;
}

export interface OBSLaunchResponse {
  success: boolean;
  message: string;
  processId?: number;
}

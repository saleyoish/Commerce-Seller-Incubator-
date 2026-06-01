import { z } from 'zod';
import { StreamStatus, StreamType, WebhookEventType } from '@/types/streaming';
import { STREAMING_CONSTANTS } from '@/constants/streaming';

// Validation schemas for streaming operations

export const CreateStreamRequestSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(STREAMING_CONSTANTS.LIMITS.MAX_TITLE_LENGTH, 'Title too long')
    .optional(),
  description: z.string()
    .max(STREAMING_CONSTANTS.LIMITS.MAX_DESCRIPTION_LENGTH, 'Description too long')
    .optional(),
  platforms: z.array(z.string())
    .min(1, 'At least one platform is required')
    .max(STREAMING_CONSTANTS.LIMITS.MAX_PLATFORMS_PER_STREAM, 'Too many platforms')
    .refine(
      (platforms: string[]) => platforms.every((p: string) => Object.keys(STREAMING_CONSTANTS.PLATFORMS).includes(p.toLowerCase())),
      'Invalid platform selected'
    ),
  selectedProducts: z.array(z.string())
    .max(STREAMING_CONSTANTS.LIMITS.MAX_PRODUCTS_PER_STREAM, 'Too many products')
    .optional(),
  type: z.nativeEnum(StreamType).default(StreamType.INSTANT),
  scheduledStart: z.string().datetime().optional()
});

export const OBSLaunchRequestSchema = z.object({
  obsPath: z.string().min(1, 'OBS path is required'),
  server: z.string().url('Invalid server URL'),
  streamKey: z.string().min(1, 'Stream key is required'),
  title: z.string().optional(),
  config: z.object({
    bitrate: z.number().min(STREAMING_CONSTANTS.RTMP.MIN_BITRATE).max(STREAMING_CONSTANTS.RTMP.MAX_BITRATE).optional(),
    fps: z.number().min(24).max(60).optional(),
    resolution: z.object({
      width: z.number().min(640).max(3840),
      height: z.number().min(480).max(2160)
    }).optional()
  }).optional()
});

export const RestreamWebhookEventSchema = z.object({
  type: z.nativeEnum(WebhookEventType),
  data: z.object({
    id: z.string(),
    streamId: z.string(),
    title: z.string().optional(),
    userId: z.string(),
    platform: z.string().optional(),
    startedAt: z.string().datetime().optional(),
    endedAt: z.string().datetime().optional(),
    status: z.string().optional(),
    duration: z.number().optional(),
    metrics: z.object({
      currentViewers: z.number(),
      peakViewers: z.number(),
      totalViewers: z.number(),
      bitrate: z.number(),
      fps: z.number(),
      platforms: z.array(z.object({
        name: z.string(),
        viewers: z.number(),
        peakViewers: z.number(),
        engagedUsers: z.number(),
        salesCount: z.number(),
        salesTotal: z.number()
      }))
    }).optional()
  }),
  timestamp: z.string().datetime(),
  signature: z.string().optional()
});

export const StreamStatusUpdateSchema = z.object({
  status: z.nativeEnum(StreamStatus),
  actual_start: z.string().datetime().optional(),
  actual_end: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
});

// Environment variable validation
export const StreamingEnvSchema = z.object({
  RESTREAM_API_TOKEN: z.string().min(1, 'Restream API token is required'),
  RESTREAM_WEBHOOK_SECRET: z.string().min(1, 'Webhook secret is required'),
  NEXT_PUBLIC_SITE_URL: z.string().url('Site URL is required'),
  DATABASE_URL: z.string().url('Database URL is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Service role key is required')
});

// Type inference for TypeScript
export type CreateStreamRequest = z.infer<typeof CreateStreamRequestSchema>;
export type OBSLaunchRequest = z.infer<typeof OBSLaunchRequestSchema>;
export type RestreamWebhookEvent = z.infer<typeof RestreamWebhookEventSchema>;
export type StreamStatusUpdate = z.infer<typeof StreamStatusUpdateSchema>;
export type StreamingEnv = z.infer<typeof StreamingEnvSchema>;

// Validation helper functions
export function validateCreateStreamRequest(data: unknown): CreateStreamRequest {
  const result = CreateStreamRequestSchema.safeParse(data);
  
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  
  return result.data;
}

export function validateOBSLaunchRequest(data: unknown): OBSLaunchRequest {
  const result = OBSLaunchRequestSchema.safeParse(data);
  
  if (!result.success) {
    throw new Error(`OBS launch validation failed: ${result.error.message}`);
  }
  
  return result.data;
}

export function validateRestreamWebhook(data: unknown): RestreamWebhookEvent {
  const result = RestreamWebhookEventSchema.safeParse(data);
  
  if (!result.success) {
    throw new Error(`Webhook validation failed: ${result.error.message}`);
  }
  
  return result.data;
}

export function validateStreamStatusUpdate(data: unknown): StreamStatusUpdate {
  const result = StreamStatusUpdateSchema.safeParse(data);
  
  if (!result.success) {
    throw new Error(`Status update validation failed: ${result.error.message}`);
  }
  
  return result.data;
}

export function validateEnvironment(): StreamingEnv {
  const env = {
    RESTREAM_API_TOKEN: process.env.RESTREAM_API_TOKEN,
    RESTREAM_WEBHOOK_SECRET: process.env.RESTREAM_WEBHOOK_SECRET,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  
  const result = StreamingEnvSchema.safeParse(env);
  
  if (!result.success) {
    throw new Error(`Environment validation failed: ${result.error.message}`);
  }
  
  return result.data;
}

// Production-ready streaming constants

export const STREAMING_CONSTANTS = {
  // RTMP Configuration
  RTMP: {
    RESTREAM_SERVER: 'rtmp://live.restream.io/live',
    BACKUP_SERVER: 'rtmp://backup.restream.io/live',
    DEFAULT_BITRATE: 2500,
    DEFAULT_FPS: 30,
    DEFAULT_RESOLUTION: {
      width: 1920,
      height: 1080
    },
    MAX_BITRATE: 6000,
    MIN_BITRATE: 1000
  },

  // Timeouts and Intervals
  TIMEOUTS: {
    OBS_LAUNCH: 5000, // 5 seconds
    WEBHOOK_RETRY: 30000, // 30 seconds
    STREAM_HEALTH_CHECK: 10000, // 10 seconds
    PENDING_STREAM_TIMEOUT: 300000, // 5 minutes
    MAX_WEBHOOK_RETRIES: 3
  },

  // Limits
  LIMITS: {
    MAX_CONCURRENT_STREAMS: 1,
    MAX_PLATFORMS_PER_STREAM: 10,
    MAX_PRODUCTS_PER_STREAM: 50,
    MAX_TITLE_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_RECONNECT_ATTEMPTS: 3
  },

  // Status Messages
  MESSAGES: {
    PENDING: '⏳ Starting stream...',
    LIVE: '🔴 LIVE NOW',
    ENDED: '✅ Stream ended',
    ERROR: '❌ Stream error',
    CANCELLED: '⏹️ Stream cancelled',
    CONNECTING: '🔄 Connecting to stream...',
    RECONNECTING: '🔄 Reconnecting...'
  },

  // Webhook Configuration
  WEBHOOK: {
    SIGNATURE_HEADER: 'x-restream-signature',
    SIGNATURE_ALGORITHM: 'sha256',
    TIMESTAMP_TOLERANCE: 300, // 5 minutes
    REQUIRED_HEADERS: ['content-type', 'x-restream-signature']
  },

  // OBS Configuration
  OBS: {
    DEFAULT_PATHS: {
      WINDOWS: [
        'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe',
        'C:\\Program Files (x86)\\obs-studio\\bin\\32bit\\obs32.exe'
      ],
      MAC: [
        '/Applications/OBS.app/Contents/MacOS/OBS',
        '/usr/local/bin/obs'
      ],
      LINUX: [
        '/usr/bin/obs',
        '/usr/local/bin/obs'
      ]
    },
    CONFIG_TEMPLATE: {
      version: '1.0',
      settings: {
        'Stream.Type': 'rtmp_common',
        'Stream.Service': 'Custom',
        'Stream.Encoder': 'x264',
        'Stream.VideoBitrate': 2500,
        'Stream.AudioBitrate': 128,
        'Stream.KeyframeInt': 60,
        'Stream.Preset': 'veryfast',
        'Stream.Profile': 'main'
      }
    }
  },

  // Platform Configuration
  PLATFORMS: {
    YOUTUBE: {
      name: 'youtube',
      displayName: 'YouTube',
      maxBitrate: 6000,
      supportedResolutions: ['1080p', '720p', '480p']
    },
    FACEBOOK: {
      name: 'facebook',
      displayName: 'Facebook Live',
      maxBitrate: 4000,
      supportedResolutions: ['1080p', '720p']
    },
    TWITCH: {
      name: 'twitch',
      displayName: 'Twitch',
      maxBitrate: 6000,
      supportedResolutions: ['1080p', '720p']
    },
    TIKTOK: {
      name: 'tiktok',
      displayName: 'TikTok LIVE',
      maxBitrate: 3000,
      supportedResolutions: ['720p', '480p']
    },
    INSTAGRAM: {
      name: 'instagram',
      displayName: 'Instagram Live',
      maxBitrate: 4000,
      supportedResolutions: ['1080p', '720p']
    }
  },

  // Error Codes
  ERROR_CODES: {
    STREAM_ALREADY_LIVE: 'STREAM_ALREADY_LIVE',
    INVALID_PLATFORMS: 'INVALID_PLATFORMS',
    OBS_LAUNCH_FAILED: 'OBS_LAUNCH_FAILED',
    WEBHOOK_VERIFICATION_FAILED: 'WEBHOOK_VERIFICATION_FAILED',
    STREAM_TIMEOUT: 'STREAM_TIMEOUT',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INVALID_STREAM_KEY: 'INVALID_STREAM_KEY',
    NETWORK_ERROR: 'NETWORK_ERROR'
  }
};

// Export enums for easy access
export const { StreamStatus, StreamType, WebhookEventType } = require('../types/streaming');

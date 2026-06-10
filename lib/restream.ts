// Restream.io API Integration
// API Token required from environment variables

const RESTREAM_API_BASE = 'https://api.restream.io/v2';

interface RestreamEvent {
  id: string;
  title: string;
  description?: string;
  scheduledAt?: string;
  status: 'scheduled' | 'live' | 'ended';
  rtmpsUrl: string;
  streamKey: string;
  destinations: RestreamDestination[];
}

interface RestreamDestination {
  id: string;
  platform: string;
  name: string;
  enabled: boolean;
  streamingUrl?: string;
}

class RestreamAPI {
  private apiToken: string;

  constructor() {
    this.apiToken = process.env.RESTREAM_API_TOKEN || '';
    if (!this.apiToken) {
      console.warn('RESTREAM_API_TOKEN not set - streaming will use manual mode');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${RESTREAM_API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Restream API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Create a new live event/stream
  async createEvent(params: {
    title: string;
    description?: string;
    scheduledAt?: string;
    platforms: string[]; // ['facebook', 'youtube', 'tiktok']
  }): Promise<RestreamEvent> {
    if (!this.apiToken) {
      // Return mock data for development without API token
      return {
        id: `mock-${Date.now()}`,
        title: params.title,
        description: params.description,
        scheduledAt: params.scheduledAt,
        status: 'scheduled',
        rtmpsUrl: 'rtmp://live.restream.io/live',
        streamKey: `mock-key-${Date.now()}`,
        destinations: params.platforms.map(p => ({
          id: `dest-${p}`,
          platform: p,
          name: p,
          enabled: true,
        })),
      };
    }

    // Create event on Restream
    const event = await this.request('/events', {
      method: 'POST',
      body: JSON.stringify({
        title: params.title,
        description: params.description,
        scheduledAt: params.scheduledAt,
        meta: {
          source: 'commerce-platform',
        },
      }),
    });

    // Add destinations for each platform
    for (const platform of params.platforms) {
      await this.request(`/events/${event.id}/destinations`, {
        method: 'POST',
        body: JSON.stringify({ platform }),
      });
    }

    // Get updated event with stream key
    const fullEvent = await this.request(`/events/${event.id}`);
    
    return {
      id: fullEvent.id,
      title: fullEvent.title,
      description: fullEvent.description,
      scheduledAt: fullEvent.scheduledAt,
      status: fullEvent.status,
      rtmpsUrl: fullEvent.rtmpsUrl || fullEvent.rtmpUrl,
      streamKey: fullEvent.streamKey,
      destinations: fullEvent.destinations || [],
    };
  }

  // Get event details
  async getEvent(eventId: string): Promise<RestreamEvent> {
    if (!this.apiToken || eventId.startsWith('mock-')) {
      return {
        id: eventId,
        title: 'Mock Stream',
        status: 'live',
        rtmpsUrl: 'rtmp://live.restream.io/live',
        streamKey: 'mock-key',
        destinations: [],
      };
    }

    const event = await this.request(`/events/${eventId}`);
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      scheduledAt: event.scheduledAt,
      status: event.status,
      rtmpsUrl: event.rtmpsUrl || event.rtmpUrl,
      streamKey: event.streamKey,
      destinations: event.destinations || [],
    };
  }

  // Start an event (mark as live)
  async startEvent(eventId: string): Promise<void> {
    if (!this.apiToken || eventId.startsWith('mock-')) {
      return;
    }

    await this.request(`/events/${eventId}/start`, {
      method: 'POST',
    });
  }

  // End an event
  async endEvent(eventId: string): Promise<void> {
    if (!this.apiToken || eventId.startsWith('mock-')) {
      return;
    }

    await this.request(`/events/${eventId}/end`, {
      method: 'POST',
    });
  }

  // Get stream health/status
  async getStreamHealth(eventId: string): Promise<{
    isLive: boolean;
    viewers: number;
    bitrate?: number;
    fps?: number;
  }> {
    if (!this.apiToken || eventId.startsWith('mock-')) {
      return {
        isLive: true,
        viewers: 0,
      };
    }

    try {
      const metrics = await this.request(`/events/${eventId}/metrics`);
      return {
        isLive: metrics.isLive || false,
        viewers: metrics.viewers || 0,
        bitrate: metrics.bitrate,
        fps: metrics.fps,
      };
    } catch {
      return {
        isLive: false,
        viewers: 0,
      };
    }
  }

  // Get user's connected platforms/destinations
  async getDestinations(): Promise<RestreamDestination[]> {
    if (!this.apiToken) {
      return [
        { id: 'fb', platform: 'facebook', name: 'Facebook', enabled: true },
        { id: 'yt', platform: 'youtube', name: 'YouTube', enabled: true },
        { id: 'tt', platform: 'tiktok', name: 'TikTok', enabled: true },
      ];
    }

    const dests = await this.request('/destinations');
    return dests.map((d: any) => ({
      id: d.id,
      platform: d.platform,
      name: d.name || d.platform,
      enabled: d.enabled,
      streamingUrl: d.streamingUrl,
    }));
  }
}

export const restreamAPI = new RestreamAPI();
export type { RestreamEvent, RestreamDestination };

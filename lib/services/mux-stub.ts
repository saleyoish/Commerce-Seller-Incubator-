// Mux video processing service - STUB IMPLEMENTATION
// TODO: Install @mux/mux-node package when ready to use real API

export interface MuxAsset {
  id: string;
  status: 'preparing' | 'ready' | 'errored';
  playback_ids?: Array<{ id: string; policy: string }>;
  duration?: number;
  max_stored_resolution?: string;
  created_at: string;
}

export interface MuxUpload {
  id: string;
  url: string;
  status: 'waiting' | 'asset_created' | 'errored';
  asset_id?: string;
}

export interface ClipOptions {
  start: number;
  end: number;
}

export async function createDirectUpload(): Promise<MuxUpload> {
  console.warn('Mux API not configured - returning mock data');
  return {
    id: `mock-upload-${Date.now()}`,
    url: 'https://mock-mux-upload.com',
    status: 'waiting',
  };
}

export async function getAsset(assetId: string): Promise<MuxAsset | null> {
  console.warn('Mux API not configured - returning mock data');
  return {
    id: assetId,
    status: 'ready',
    playback_ids: [{ id: `mock-playback-${assetId}`, policy: 'public' }],
    duration: 300,
    max_stored_resolution: '1080p',
    created_at: new Date().toISOString(),
  };
}

export async function deleteAsset(assetId: string): Promise<boolean> {
  console.warn('Mux API not configured - mock delete');
  return true;
}

export function getPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export async function waitForAssetReady(assetId: string, maxAttempts = 30): Promise<MuxAsset | null> {
  console.warn('Mux API not configured - returning mock data');
  return getAsset(assetId);
}

export async function createClip(assetId: string, options: ClipOptions): Promise<MuxAsset> {
  console.warn('Mux API not configured - returning mock clip data');
  return {
    id: `mock-clip-${Date.now()}`,
    status: 'ready',
    playback_ids: [{ id: `mock-clip-playback-${Date.now()}`, policy: 'public' }],
    duration: options.end - options.start,
    created_at: new Date().toISOString(),
  };
}

export async function createAssetFromUpload(): Promise<{ uploadUrl: string; assetId: string }> {
  console.warn('Mux API not configured - returning mock upload URL');
  const mockId = `mock-${Date.now()}`;
  return {
    uploadUrl: `https://mock-mux-upload.com/${mockId}`,
    assetId: mockId,
  };
}

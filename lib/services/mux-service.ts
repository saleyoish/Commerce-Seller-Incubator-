// Mux video processing service - STUB IMPLEMENTATION
// Re-exports from mux-stub for compatibility

export type { MuxAsset, MuxUpload, ClipOptions } from './mux-stub';
export {
  createDirectUpload,
  getAsset,
  deleteAsset,
  getPlaybackUrl,
  waitForAssetReady,
  createClip,
  createAssetFromUpload,
} from './mux-stub';

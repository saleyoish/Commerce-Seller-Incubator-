// Clip generation service for content automation
import { createClip, getAsset } from './mux-stub';
import { transcribeFromMux, generateSRT } from './assemblyai-stub';
import { createAdminSupabase } from '../supabase-admin';
import type { StreamRecording, GeneratedClip, ClipCaption } from '../supabase-client';

const CLIP_DURATION_SECONDS = 30; // Standard clip duration
const CLIP_INTERVAL_MINUTES = 15; // Generate clip every 15 minutes

export interface ClipGenerationConfig {
  clipDuration: number;
  intervalMinutes: number;
  generateCaptions: boolean;
}

export const DEFAULT_CLIP_CONFIG: ClipGenerationConfig = {
  clipDuration: CLIP_DURATION_SECONDS,
  intervalMinutes: CLIP_INTERVAL_MINUTES,
  generateCaptions: true,
};

export async function generateClipsFromRecording(
  recording: StreamRecording,
  config: ClipGenerationConfig = DEFAULT_CLIP_CONFIG
): Promise<GeneratedClip[]> {
  const supabase = createAdminSupabase();
  const clips: GeneratedClip[] = [];

  if (!recording.mux_asset_id || !recording.duration) {
    throw new Error('Recording missing Mux asset ID or duration');
  }

  // Calculate clip intervals
  const intervalSeconds = config.intervalMinutes * 60;
  const numClips = Math.floor(recording.duration / intervalSeconds);

  for (let i = 0; i < numClips; i++) {
    const startTime = i * intervalSeconds;
    const endTime = Math.min(startTime + config.clipDuration, recording.duration);

    try {
      // Create clip in Mux
      const muxClip = await createClip(recording.mux_asset_id, {
        start: startTime,
        end: endTime,
      });

      // Store clip record in database
      const { data: clip, error } = await supabase
        .from('generated_clips')
        .insert({
          stream_recording_id: recording.id,
          seller_id: recording.seller_id,
          clip_number: i + 1,
          generation_method: 'interval',
          start_time: startTime,
          duration: endTime - startTime,
          status: 'generating',
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing clip:', error);
        continue;
      }

      clips.push(clip as GeneratedClip);

      // Update clip with Mux asset info
      await supabase
        .from('generated_clips')
        .update({
          raw_clip_path: muxClip.playback_ids?.[0]?.id,
          status: config.generateCaptions ? 'captioning' : 'ready',
        })
        .eq('id', clip.id);

      // Generate captions if enabled
      if (config.generateCaptions && muxClip.playback_ids?.[0]?.id) {
        await generateCaptionsForClip(
          clip.id,
          muxClip.playback_ids[0].id,
          config.clipDuration
        );
      }
    } catch (error) {
      console.error(`Error generating clip ${i + 1}:`, error);
    }
  }

  return clips;
}

async function generateCaptionsForClip(
  clipId: string,
  playbackId: string,
  clipDuration: number
): Promise<void> {
  const supabase = createAdminSupabase();

  try {
    // Get transcription from AssemblyAI
    const transcript = await transcribeFromMux(playbackId);

    // Generate SRT content
    const srtContent = generateSRT(transcript);

    // Store caption data
    const { error } = await supabase.from('clip_captions').insert({
      clip_id: clipId,
      transcript_text: transcript.text,
      srt_content: srtContent,
      language: transcript.language_code,
      word_count: transcript.words.length,
      assemblyai_transcript_id: transcript.id,
      confidence_score: transcript.confidence,
    });

    if (error) {
      console.error('Error storing captions:', error);
    }

    // Update clip status to ready
    await supabase
      .from('generated_clips')
      .update({
        status: 'ready',
        caption_file_path: `captions/${clipId}.srt`,
      })
      .eq('id', clipId);
  } catch (error) {
    console.error('Error generating captions:', error);
    
    // Mark clip as ready even if captions failed
    await supabase
      .from('generated_clips')
      .update({ status: 'ready' })
      .eq('id', clipId);
  }
}

export async function regenerateCaptions(
  clipId: string,
  playbackId: string
): Promise<boolean> {
  const supabase = createAdminSupabase();

  try {
    const transcript = await transcribeFromMux(playbackId);
    const srtContent = generateSRT(transcript);

    // Update or insert caption record
    const { error } = await supabase.from('clip_captions').upsert(
      {
        clip_id: clipId,
        transcript_text: transcript.text,
        srt_content: srtContent,
        language: transcript.language_code,
        word_count: transcript.words.length,
        assemblyai_transcript_id: transcript.id,
        confidence_score: transcript.confidence,
      },
      { onConflict: 'clip_id' }
    );

    if (error) {
      console.error('Error regenerating captions:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in caption regeneration:', error);
    return false;
  }
}

export function calculateClipTimes(
  totalDuration: number,
  intervalMinutes: number,
  clipDuration: number
): Array<{ start: number; end: number }> {
  const intervalSeconds = intervalMinutes * 60;
  const times: Array<{ start: number; end: number }> = [];
  
  for (let start = 0; start + clipDuration <= totalDuration; start += intervalSeconds) {
    times.push({
      start,
      end: Math.min(start + clipDuration, totalDuration),
    });
  }
  
  return times;
}

// AssemblyAI caption generation service - STUB IMPLEMENTATION
// TODO: Install assemblyai package when ready to use real API

export interface TranscriptResult {
  id: string;
  text: string;
  words: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  confidence: number;
  language_code: string;
}

export async function transcribeAudio(audioUrl: string): Promise<TranscriptResult> {
  console.warn('AssemblyAI not configured - returning mock transcript');
  return {
    id: `mock-transcript-${Date.now()}`,
    text: 'This is a mock transcript. Install assemblyai package for real transcription.',
    words: [
      { text: 'This', start: 0, end: 200, confidence: 0.95 },
      { text: 'is', start: 200, end: 400, confidence: 0.98 },
      { text: 'mock', start: 400, end: 800, confidence: 0.92 },
    ],
    confidence: 0.95,
    language_code: 'en',
  };
}

export async function transcribeFromMux(playbackId: string): Promise<TranscriptResult> {
  return transcribeAudio(`https://stream.mux.com/${playbackId}.m3u8`);
}

export function generateSRT(transcript: TranscriptResult): string {
  const lines: string[] = [];
  let cueNumber = 1;

  for (const word of transcript.words) {
    const startTime = formatSRTTime(word.start);
    const endTime = formatSRTTime(word.end);

    lines.push(String(cueNumber));
    lines.push(`${startTime} --> ${endTime}`);
    lines.push(word.text);
    lines.push('');

    cueNumber++;
  }

  return lines.join('\n');
}

function formatSRTTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = Math.floor(milliseconds % 1000);

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${padMs(ms)}`;
}

function pad(num: number): string {
  return num.toString().padStart(2, '0');
}

function padMs(num: number): string {
  return num.toString().padStart(3, '0');
}

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  strokeColor: string;
  strokeWidth: number;
  position: 'bottom' | 'middle' | 'top';
}

export const CAPTION_STYLES: Record<string, CaptionStyle> = {
  classic: {
    fontFamily: 'Arial',
    fontSize: 24,
    fontColor: '#FFFFFF',
    backgroundColor: 'transparent',
    strokeColor: '#000000',
    strokeWidth: 2,
    position: 'bottom',
  },
  bold: {
    fontFamily: 'Impact',
    fontSize: 32,
    fontColor: '#FFFF00',
    backgroundColor: 'transparent',
    strokeColor: '#000000',
    strokeWidth: 4,
    position: 'bottom',
  },
  minimal: {
    fontFamily: 'Helvetica',
    fontSize: 20,
    fontColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.5)',
    strokeColor: 'transparent',
    strokeWidth: 0,
    position: 'bottom',
  },
};

export async function getTranscript(transcriptId: string): Promise<TranscriptResult | null> {
  console.warn('AssemblyAI not configured - returning mock transcript');
  return {
    id: transcriptId,
    text: 'Mock transcript data.',
    words: [{ text: 'Mock', start: 0, end: 500, confidence: 0.9 }],
    confidence: 0.9,
    language_code: 'en',
  };
}

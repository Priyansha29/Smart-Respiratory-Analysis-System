/* ============================================================
   PulmoSense — analysis service (API abstraction)
   ------------------------------------------------------------
   The dashboard only ever calls `analyzeAudio(file)`.

   STAGE 1 (now)     : returns deterministic mock analysis built
                       from the uploaded recording + demo model
                       outputs (src/data/mockAnalysis.ts).
   STAGE 3 (later)   : the same function performs
                       POST /analyze (multipart/form-data) against
                       the FastAPI layer, which serialises results
                       from the MATLAB entry point
                       analyzeRespiratoryRecording().

   Switching stages requires NO component changes — only this
   file (or the VITE_API_BASE environment variable).

   Planned endpoints:
     POST /analyze   multipart/form-data  -> AnalysisResult JSON
     GET  /health                                    -> status
   ============================================================ */

import type { AnalysisResult } from "../types/analysis";
import { buildMockAnalysis } from "../data/mockAnalysis";
import { parseWav, readWavSamples } from "../utils/wav";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

/** True while running without a configured backend (Stage 1). */
export const IS_MOCK_MODE = API_BASE.length === 0;

const ANALYZE_PATH = "/analyze";
const HEALTH_PATH = "/health";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Analyzes a respiratory sound recording.
 *
 * @param file WAV recording selected by the user.
 * @returns the full structured AnalysisResult for the UI.
 */
export async function analyzeAudio(file: File): Promise<AnalysisResult> {
  return IS_MOCK_MODE ? mockAnalyze(file) : requestAnalyze(file);
}

/* ------------------------------------------------------------
   Stage 3+ : real FastAPI request (kept ready, unused in Stage 1)
   ------------------------------------------------------------ */

async function requestAnalyze(file: File): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("audio", file, file.name);

  const response = await fetch(`${API_BASE}${ANALYZE_PATH}`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Analysis failed (HTTP ${response.status}).`);
  }
  return (await response.json()) as AnalysisResult;
}

/** Optional backend liveness probe used by the header status pill. */
export async function healthCheck(): Promise<boolean> {
  if (IS_MOCK_MODE) return false;
  try {
    const response = await fetch(`${API_BASE}${HEALTH_PATH}`);
    return response.ok;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------
   Stage 1 : mock analysis
   ------------------------------------------------------------ */

async function mockAnalyze(file: File): Promise<AnalysisResult> {
  // Realistic latency so the loading state is exercised in demos.
  await delay(1300);

  let wav = await readWavSamples(file);

  if (!wav) {
    // Non-PCM / unusual container: fall back to browser decoding.
    const decoded = await decodeWithWebAudio(file);
    if (!decoded) {
      throw new Error(
        "The selected file could not be read as a WAV respiratory recording."
      );
    }
    wav = decoded;
  }

  return buildMockAnalysis(file.name, wav);
}

async function decodeWithWebAudio(
  file: File
): Promise<Awaited<ReturnType<typeof parseWav>>> {
  try {
    const buffer = await file.arrayBuffer();
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtor();
    try {
      const audio = await ctx.decodeAudioData(buffer.slice(0));
      const channel = audio.getChannelData(0);
      return {
        samplingRate: audio.sampleRate,
        channels: audio.numberOfChannels,
        bitsPerSample: 32,
        duration: audio.duration,
        sampleCount: channel.length,
        samples: new Float32Array(channel),
      };
    } finally {
      void ctx.close();
    }
  } catch {
    return null;
  }
}

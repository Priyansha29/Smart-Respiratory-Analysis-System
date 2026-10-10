/* ============================================================
   Smart Respiratory Lung Analysis System — analysis service (API abstraction)
   ------------------------------------------------------------
   The dashboard only ever calls `analyzeAudio(file)`.

   STAGE 2 (now)
     • VITE_API_BASE set      -> real mode. POST /analyze (multipart)
                                 against the FastAPI layer, which calls the
                                 MATLAB inference worker (Part 4 models).
     • VITE_DEMO_MODE = "true"-> demo mode. Explicitly selected simulated
                                 analysis, always labelled "Demo data".
     • neither set            -> unconfigured. `analyzeAudio` throws a clear
                                 error; the dashboard never silently mocks.

   The backend returns the same AnalysisResult JSON shape the UI is built
   against, so no component needs to change when switching modes.
   ============================================================ */

import type { AnalysisResult } from "../types/analysis";
import { buildMockAnalysis } from "../data/mockAnalysis";
import { parseWav, readWavSamples } from "../utils/wav";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const DEMO_ENABLED = (import.meta.env.VITE_DEMO_MODE ?? "false") === "true";

/** Real backend configured? */
export const HAS_BACKEND = API_BASE.length > 0;
/** Explicitly-selected demo mode (never an implicit fallback). */
export const IS_DEMO_MODE = !HAS_BACKEND && DEMO_ENABLED;
/** True when the dashboard cannot analyse anything (no backend, no demo). */
export const IS_UNCONFIGURED = !HAS_BACKEND && !IS_DEMO_MODE;

const ANALYZE_PATH = "/analyze";
const HEALTH_PATH = "/health";

/* ------------------------------------------------------------
   Types
   ------------------------------------------------------------ */

/** Upload/analysis progress surfaced to the UI. */
export interface AnalyzeProgress {
  phase: "uploading" | "analyzing";
  /** 0–100 for the upload phase; 100 once analysis begins. */
  percent: number;
}

/** Shape of GET /health. */
export interface BackendHealth {
  status: string;
  api: string;
  demo_mode: boolean;
  matlab_available: boolean;
  matlab_worker: string;
  matlab_version?: string | null;
  worker_detail?: string | null;
  model_artifact?: string | null;
  model_artifact_accessible: boolean;
  inference_ready: boolean;
}

/** Raised when no analysis backend is configured. */
export class AnalysisConfigError extends Error {}

/* ------------------------------------------------------------
   Public API
   ------------------------------------------------------------ */

/**
 * Analyze a respiratory sound recording.
 *
 * @param file       WAV recording selected by the user.
 * @param onProgress optional progress callback (upload then analysis).
 */
export async function analyzeAudio(
  file: File,
  onProgress?: (progress: AnalyzeProgress) => void
): Promise<AnalysisResult> {
  if (HAS_BACKEND) return requestAnalyze(file, onProgress);
  if (IS_DEMO_MODE) return mockAnalyze(file, onProgress);
  throw new AnalysisConfigError(
    "No analysis backend is configured. Set VITE_API_BASE to the FastAPI URL " +
      "(e.g. http://127.0.0.1:8000), or enable demo mode with VITE_DEMO_MODE=true."
  );
}

/** GET /health, or null when unavailable / not configured. */
export async function getHealth(): Promise<BackendHealth | null> {
  if (!HAS_BACKEND) return null;
  try {
    const response = await fetch(`${API_BASE}${HEALTH_PATH}`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as BackendHealth;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------
   Real request (XHR for genuine upload progress)
   ------------------------------------------------------------ */

function requestAnalyze(
  file: File,
  onProgress?: (progress: AnalyzeProgress) => void
): Promise<AnalysisResult> {
  return new Promise<AnalysisResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}${ANALYZE_PATH}`);
    xhr.responseType = "text";
    // Cold-starting the MATLAB worker + inference can take a while.
    xhr.timeout = 300_000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          phase: "uploading",
          percent: Math.round((event.loaded / event.total) * 100),
        });
      }
    };
    xhr.upload.onload = () => onProgress?.({ phase: "analyzing", percent: 100 });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as AnalysisResult);
        } catch {
          reject(new Error("The analysis backend returned an unreadable response."));
        }
        return;
      }
      reject(new Error(errorMessage(xhr.status, xhr.responseText)));
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "Could not reach the analysis backend. Make sure the FastAPI server is running."
        )
      );
    xhr.ontimeout = () =>
      reject(new Error("The analysis request timed out. Please try a shorter recording."));

    const form = new FormData();
    form.append("audio", file, file.name);
    xhr.send(form);
  });
}

function errorMessage(status: number, body: string): string {
  let detail = "";
  try {
    const parsed = JSON.parse(body) as { detail?: unknown };
    if (typeof parsed.detail === "string") detail = parsed.detail;
  } catch {
    /* not JSON */
  }
  if (status === 503) {
    return detail || "The analysis engine is still starting. Please retry shortly.";
  }
  if (status === 415) return detail || "Only WAV recordings are supported.";
  if (status === 413) return detail || "The recording is too large.";
  if (status === 400) return detail || "The recording file is empty or invalid.";
  if (status === 422) return detail || "The recording could not be analysed.";
  return detail || `Analysis failed (HTTP ${status}).`;
}

/* ------------------------------------------------------------
   Demo analysis (explicitly enabled only)
   ------------------------------------------------------------ */

async function mockAnalyze(
  file: File,
  onProgress?: (progress: AnalyzeProgress) => void
): Promise<AnalysisResult> {
  // Exercise the upload/analysis states even in demo mode.
  onProgress?.({ phase: "uploading", percent: 100 });
  onProgress?.({ phase: "analyzing", percent: 100 });
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

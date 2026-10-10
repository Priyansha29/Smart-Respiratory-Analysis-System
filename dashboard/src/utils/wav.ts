/* ============================================================
   Smart Respiratory Lung Analysis System — WAV file inspection
   ------------------------------------------------------------
   Reads genuine file information (sampling rate, duration,
   channels, samples) straight from the WAV container so the
   audio panel can display real recording properties before any
   analysis runs. This is file metadata, not model analysis.
   ============================================================ */

import type { AudioMetadata } from "../types/analysis";

export interface ParsedWav {
  samplingRate: number;
  channels: number;
  bitsPerSample: number;
  duration: number;
  sampleCount: number;
  /** Mono-mixed, normalized float samples of channel 0 (or mix). */
  samples: Float32Array;
}

const RIFF = 0x52494646; // "RIFF"
const WAVE = 0x57415645; // "WAVE"
const fmt = 0x666d7420; // "fmt "
const data = 0x64617461; // "data"

/**
 * Minimal RIFF/WAVE parser supporting PCM (1) and IEEE float (3)
 * including the WAVE_FORMAT_EXTENSIBLE wrapper.
 */
export function parseWav(buffer: ArrayBuffer): ParsedWav | null {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 44) return null;
    if (view.getUint32(0, false) !== RIFF) return null;
    if (view.getUint32(8, false) !== WAVE) return null;

    let offset = 12;
    let audioFormat = 1;
    let channels = 1;
    let samplingRate = 0;
    let bitsPerSample = 16;
    let dataOffset = -1;
    let dataLength = 0;

    while (offset + 8 <= view.byteLength) {
      const chunkId = view.getUint32(offset, false);
      const chunkSize = view.getUint32(offset + 4, true);
      const body = offset + 8;

      if (chunkId === fmt) {
        audioFormat = view.getUint16(body, true);
        channels = view.getUint16(body + 2, true);
        samplingRate = view.getUint32(body + 4, true);
        bitsPerSample = view.getUint16(body + 14, true);
        // WAVE_FORMAT_EXTENSIBLE: real format lives in the SubFormat GUID.
        if (audioFormat === 0xfffe && chunkSize >= 40) {
          audioFormat = view.getUint16(body + 24, true);
        }
      } else if (chunkId === data) {
        dataOffset = body;
        dataLength = Math.min(chunkSize, view.byteLength - body);
      }

      offset = body + chunkSize + (chunkSize % 2); // chunks are word-aligned
      if (chunkSize === 0 && dataOffset >= 0) break;
    }

    if (dataOffset < 0 || samplingRate === 0 || channels < 1) return null;
    if (audioFormat !== 1 && audioFormat !== 3) return null;

    const bytesPerSample = bitsPerSample / 8;
    const frameCount = Math.floor(dataLength / (bytesPerSample * channels));
    if (frameCount <= 0) return null;

    const samples = new Float32Array(frameCount);
    const maxValue = 2 ** (bitsPerSample - 1);

    for (let i = 0; i < frameCount; i++) {
      const frameStart = dataOffset + i * bytesPerSample * channels;
      let value = 0;

      if (audioFormat === 3 && bitsPerSample === 32) {
        value = view.getFloat32(frameStart, true);
      } else if (bitsPerSample === 8) {
        value = (view.getUint8(frameStart) - 128) / 128;
        samples[i] = value;
        continue;
      } else if (bitsPerSample === 16) {
        value = view.getInt16(frameStart, true) / maxValue;
      } else if (bitsPerSample === 24) {
        const b0 = view.getUint8(frameStart);
        const b1 = view.getUint8(frameStart + 1);
        const b2 = view.getUint8(frameStart + 2);
        let int = (b2 << 16) | (b1 << 8) | b0;
        if (int & 0x800000) int |= ~0xffffff; // sign-extend
        value = int / maxValue;
      } else if (bitsPerSample === 32) {
        value = view.getInt32(frameStart, true) / maxValue;
      }

      samples[i] = value;
    }

    return {
      samplingRate,
      channels,
      bitsPerSample,
      duration: frameCount / samplingRate,
      sampleCount: frameCount,
      samples,
    };
  } catch {
    return null;
  }
}

/**
 * Builds display metadata for a selected recording.
 * Falls back to the Web Audio decoder for non-PCM/odd containers.
 */
export async function readAudioMetadata(file: File): Promise<AudioMetadata> {
  const buffer = await file.arrayBuffer();
  const parsed = parseWav(buffer);

  if (parsed) {
    return {
      fileName: file.name,
      duration: parsed.duration,
      samplingRate: parsed.samplingRate,
      channels: parsed.channels,
      sampleCount: parsed.sampleCount,
      playbackUrl: URL.createObjectURL(file),
    };
  }

  // Fallback: let the browser decode the file.
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new AudioCtor();
  try {
    const decoded = await ctx.decodeAudioData(buffer.slice(0));
    const channel = decoded.getChannelData(0);
    return {
      fileName: file.name,
      duration: decoded.duration,
      samplingRate: decoded.sampleRate,
      channels: decoded.numberOfChannels,
      sampleCount: channel.length,
      playbackUrl: URL.createObjectURL(file),
    };
  } finally {
    void ctx.close();
  }
}

/** Loads raw mono samples for a WAV file (used by the mock analyzer). */
export async function readWavSamples(file: File): Promise<ParsedWav | null> {
  const buffer = await file.arrayBuffer();
  return parseWav(buffer);
}

/* Generates a synthetic respiratory-like WAV recording for demoing
 * the PulmoSense dashboard (Stage 1). Not medical data.
 *
 * Usage: node scripts/generateSample.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fs = 4000; // Hz — matches common ICBHI recordings
const duration = 8.5; // s
const n = Math.round(fs * duration);

// Deterministic PRNG.
let seed = 20260101;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const cycle = 3.6; // s → ~16.7 breaths/min
const samples = new Float64Array(n);

// Crackle events (short explosive bursts during inspiration).
const crackles = [1.35, 1.52, 1.71, 5.02, 5.19, 6.94].map((t) => ({
  t,
  amp: 0.35 + rand() * 0.3,
}));

for (let i = 0; i < n; i++) {
  const t = i / fs;
  const phase = (t % cycle) / cycle;

  // Asymmetric breathing envelope: inspiration (phase < 0.42) is
  // shorter and stronger than expiration.
  let env;
  if (phase < 0.42) {
    env = Math.sin((phase / 0.42) * Math.PI) * 1.0;
  } else {
    env = Math.sin(((phase - 0.42) / 0.58) * Math.PI) * 0.72;
  }

  // Broadband breath noise (band-limited approximation).
  const noise = (rand() * 2 - 1) * 0.048;

  // Continuous tonal "wheeze" component, strongest mid-expiration.
  const wheezeGate = phase > 0.45 && phase < 0.92 ? 1 : 0.15;
  const wheeze =
    Math.sin(2 * Math.PI * 335 * t + 0.7 * Math.sin(2 * Math.PI * 6 * t)) *
    0.55 *
    wheezeGate *
    env;

  // Slow low-frequency wander (motion artefact residue).
  const wander = Math.sin(2 * Math.PI * 0.6 * t) * 0.015;

  samples[i] = env * noise + env * wheeze + wander;
}

// Add crackles.
for (const c of crackles) {
  const start = Math.round(c.t * fs);
  const len = Math.round(0.014 * fs); // 14 ms burst
  for (let k = 0; k < len && start + k < n; k++) {
    const decay = Math.exp(-k / (len * 0.28));
    samples[start + k] +=
      (rand() * 2 - 1) * c.amp * decay * Math.sin((k / len) * Math.PI);
  }
}

// Normalize to ±0.9.
let peak = 0;
for (const s of samples) peak = Math.max(peak, Math.abs(s));
const gain = 0.9 / (peak || 1);

/* ---------------- WAV container (16-bit PCM mono) ---------------- */
const dataBytes = n * 2;
const buffer = Buffer.alloc(44 + dataBytes);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataBytes, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(1, 22); // mono
buffer.writeUInt32LE(fs, 24);
buffer.writeUInt32LE(fs * 2, 28); // byte rate
buffer.writeUInt16LE(2, 32); // block align
buffer.writeUInt16LE(16, 34); // bits per sample
buffer.write("data", 36);
buffer.writeUInt32LE(dataBytes, 40);

for (let i = 0; i < n; i++) {
  const v = Math.max(-1, Math.min(1, samples[i] * gain));
  buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
}

const outDir = join(__dirname, "..", "samples");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "demo_respiratory_recording.wav");
writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath} (${(buffer.length / 1024).toFixed(1)} KB, ${duration}s @ ${fs} Hz)`);

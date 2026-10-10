/* ============================================================
   Smart Respiratory Lung Analysis System — formatting helpers
   ============================================================ */

/** Round to `digits` decimals and drop trailing zeros. */
export function round(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Fixed-decimal string, e.g. 91.4 -> "91.4". */
export function fixed(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "–";
  return value.toFixed(digits);
}

/** Percentage string from a 0–1 fraction: 0.914 -> "91.4%". */
export function percent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "–";
  return `${(value * 100).toFixed(digits)}%`;
}

/** Percentage string from an already-scaled 0–100 value. */
export function pctPoints(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "–";
  return `${value.toFixed(digits)}%`;
}

/** Seconds with unit: 8.42 -> "8.42 s". */
export function seconds(value: number, digits = 2): string {
  return `${value.toFixed(digits)} s`;
}

/** Compact hertz label: 4000 -> "4,000 Hz". */
export function hz(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} Hz`;
}

/** Thousands separator for raw sample counts. */
export function count(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/** Clamp helper. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** mm:ss for playback time display. */
export function timecode(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const m = Math.floor(value / 60);
  const s = Math.floor(value % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

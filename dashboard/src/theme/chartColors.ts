import type { SoundClassKey } from "../types/analysis";

/**
 * Consistent per-class colors used across PCA, reliability and
 * agreement visuals. Kept inside the blue/cyan family with one
 * green for "Normal" to respect the restrained clinical palette.
 */
export const CLASS_COLORS: Record<SoundClassKey, string> = {
  normal: "#1F9D6D",
  crackle: "#2C5EAD",
  wheeze: "#00B7CD",
  crackleWheeze: "#4BB8FA",
};

import type { SoundClassKey } from "../types/analysis";

/**
 * Consistent per-class colors used across PCA, reliability and
 * agreement visuals. Kept inside the teal family with a single coral
 * accent for the mixed class, to respect the restrained biomedical
 * palette while staying distinguishable.
 */
export const CLASS_COLORS: Record<SoundClassKey, string> = {
  normal: "#1E8E7E",
  crackle: "#0D4946",
  wheeze: "#3E9E92",
  crackleWheeze: "#FF8066",
};

import type { AnalysisResult } from "../types/analysis";

/** Looks up a single engineered feature value by MATLAB feature name. */
export function featureValue(
  result: AnalysisResult,
  name: string
): number | undefined {
  return result.features.features.find((f) => f.name === name)?.value;
}

/** Looks up a feature's display group. */
export function featureGroup(
  result: AnalysisResult,
  name: string
): string | undefined {
  return result.features.features.find((f) => f.name === name)?.group;
}

/* ============================================================
   PulmoSense — Analysis data contract
   ------------------------------------------------------------
   This module defines the structured JSON contract exchanged
   between the dashboard and the API layer.

   Stage 1  : src/services/api.ts returns mock data of this shape.
   Stage 3+ : the same shape is returned by POST /analyze from the
              FastAPI layer, which serialises MATLAB results from
              analyzeRespiratoryRecording().

   The UI is written ONLY against these types, so swapping the
   mock service for a real endpoint requires no component changes.
   ============================================================ */

/** The four respiratory acoustic classes of the trained classifier. */
export type SoundClassKey =
  | 'normal'
  | 'crackle'
  | 'wheeze'
  | 'crackleWheeze';

export interface ClassLabel {
  key: SoundClassKey;
  /** Human readable class name, e.g. "Crackle + Wheeze". */
  label: string;
  /** Short code used in dense charts / matrices. */
  short: string;
}

/** Per-class normalized scores (0–1), produced by the model layer. */
export type ClassScores = Record<SoundClassKey, number>;

/* ------------------------------------------------------------
   Prediction & interpretation
   ------------------------------------------------------------ */

export interface Prediction {
  key: SoundClassKey;
  /** Display label, e.g. "Wheeze". */
  label: string;
  /**
   * Model-derived (score-derived) confidence in percent.
   * NOT a medically calibrated probability.
   */
  confidence: number;
  /** Plain-language, non-diagnostic interpretation for the user. */
  interpretation: string;
}

/* ------------------------------------------------------------
   Signal quality
   ------------------------------------------------------------ */

export type QualityStatus = 'Good' | 'Fair' | 'Poor';

export interface SignalQuality {
  status: QualityStatus;
  /** Signal-to-noise ratio in dB. */
  snr: number;
  /** Root-mean-square error between original and processed signal. */
  rmse: number;
  /** Correlation coefficient between original and processed signal. */
  correlation: number;
  /** Mean squared error. */
  mse: number;
  /** RMS amplitude of the analyzed signal. */
  rms: number;
  /** Peak absolute amplitude. */
  peakAmplitude: number;
  duration: number; // seconds
  samplingRate: number; // Hz
  sampleCount: number;
}

/* ------------------------------------------------------------
   Waveform / time-domain series
   ------------------------------------------------------------ */

export interface TimeSeries {
  /** Time axis in seconds. */
  time: number[];
  /** Amplitude samples (downsampled for display). */
  amplitude: number[];
}

/* ------------------------------------------------------------
   Preprocessing
   ------------------------------------------------------------ */

export type PreprocessStageKey = 'original' | 'filtered' | 'denoised';

export interface PreprocessStage {
  key: PreprocessStageKey;
  label: string;
  description: string;
  signal: TimeSeries;
}

export interface FilterResponsePoint {
  frequency: number; // Hz
  iirDb: number; // Butterworth IIR magnitude response (dB)
  firDb: number; // FIR magnitude response (dB)
}

export interface PreprocessingResult {
  stages: PreprocessStage[];
  /** Magnitude response of the designed band-pass filters. */
  filterResponse: FilterResponsePoint[];
  filterSpec: {
    bandpass: string;
    iirType: string;
    firType: string;
    zeroPhase: boolean;
  };
  /** Signal-quality metrics between original and denoised signal. */
  metrics: {
    snr: number;
    rmse: number;
    correlation: number;
    mse: number;
  };
}

/* ------------------------------------------------------------
   Segmentation
   ------------------------------------------------------------ */

export interface RespiratorySegment {
  id: number;
  start: number; // s
  end: number; // s
  duration: number; // s
  /** Illustrative cycle phase labels (mock until MATLAB Stage 2). */
  phase: 'Inspiration' | 'Expiration';
}

export interface SegmentationResult {
  segments: RespiratorySegment[];
  selectedSegmentId: number;
  /** Number of cycles forwarded to feature extraction. */
  cyclesAnalyzed: number;
  /**
   * Segmentation provenance. ICBHI training data uses annotation
   * files; arbitrary uploads require automatic segmentation which
   * will be implemented in the MATLAB inference entry point.
   */
  method: string;
}

/* ------------------------------------------------------------
   Features (101 engineered acoustic features)
   ------------------------------------------------------------ */

export interface FeatureGroup {
  key: string;
  label: string;
  count: number;
  description: string;
}

export interface FeatureEntry {
  name: string;
  group: string;
  value: number;
}

export interface HeatmapData {
  /** Row labels (e.g. MFCC coefficient index). */
  rows: string[];
  /** Column labels (e.g. frame index / time). */
  cols: string[];
  /** values[row][col] — row-major matrix. */
  values: number[][];
}

export interface WaveletDecomposition {
  /** Level labels: approximation + detail levels. */
  labels: string[];
  /** Relative energy per level (0–1). */
  energies: number[];
  /** Entropy per level. */
  entropies: number[];
}

export interface SpectrogramData {
  /** Frequency bin centres (Hz). */
  frequencies: number[];
  /** Frame times (s). */
  times: number[];
  /** Magnitude in dB: values[frameIndex][freqIndex]. */
  values: number[][];
}

export interface FeatureResult {
  /** Total engineered feature vector length per respiratory cycle. */
  total: number;
  groups: FeatureGroup[];
  /** Full feature table (expandable detail view). */
  features: FeatureEntry[];
  mfcc: HeatmapData;
  spectrogram: SpectrogramData;
  wavelet: WaveletDecomposition;
  /** Grouped summary used for the distribution chart. */
  distribution: { group: string; mean: number; spread: number }[];
}

/* ------------------------------------------------------------
   PCA / feature space
   ------------------------------------------------------------ */

export interface PCAPoint {
  pc1: number;
  pc2: number;
  label: string;
  classKey: SoundClassKey;
}

export interface PCAResult {
  points: PCAPoint[];
  /** Explained variance ratio of PC1 / PC2 (fraction, 0–1). */
  explainedVariance: number[];
  /** Cumulative explained variance of the displayed components. */
  cumulativeVariance: number;
}

/* ------------------------------------------------------------
   Machine learning
   ------------------------------------------------------------ */

export interface ModelMetrics {
  accuracy: number; // 0–1
  balancedAccuracy: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface ModelEntry {
  name: string;
  shortName: string;
  metrics: ModelMetrics;
  /** Whether this model produced the displayed prediction. */
  isActive: boolean;
}

export interface ConfusionMatrix {
  labels: string[];
  /** matrix[actual][predicted] */
  matrix: number[][];
}

export interface MachineLearningResult {
  models: ModelEntry[];
  activeModel: string;
  confusionMatrix: ConfusionMatrix;
}

/* ------------------------------------------------------------
   Explainability
   ------------------------------------------------------------ */

export interface ImportanceEntry {
  name: string;
  group: string;
  /** Normalized importance 0–1 (permutation / predictor importance). */
  importance: number;
}

export interface ExplainabilityResult {
  topFeatures: ImportanceEntry[];
}

/* ------------------------------------------------------------
   Reliability
   ------------------------------------------------------------ */

export interface ReliabilityResult {
  segmentsAnalyzed: number;
  modelStatus: 'Ready' | 'Degraded' | 'Unavailable';
  /** Prediction stability across analyzed respiratory cycles (0–1). */
  predictionStability: number;
  /** Share of cycles that agreed with the aggregate prediction (0–1). */
  agreementRate: number;
  classAgreement: { label: string; share: number }[];
}

/* ------------------------------------------------------------
   Top-level response
   ------------------------------------------------------------ */

export interface AnalysisResult {
  meta: {
    fileName: string;
    analyzedAt: string; // ISO timestamp
    /** True while the dashboard runs on mock Stage-1 data. */
    isDemo: boolean;
    /** Human-readable provenance of the displayed numbers. */
    engine: string;
  };
  prediction: Prediction;
  classScores: ClassScores;
  signalQuality: SignalQuality;
  waveform: TimeSeries;
  preprocessing: PreprocessingResult;
  segmentation: SegmentationResult;
  features: FeatureResult;
  pca: PCAResult;
  machineLearning: MachineLearningResult;
  explainability: ExplainabilityResult;
  reliability: ReliabilityResult;
}

/* ------------------------------------------------------------
   Audio input metadata (read from the uploaded WAV header —
   genuine file information, independent of analysis)
   ------------------------------------------------------------ */

export interface AudioMetadata {
  fileName: string;
  duration: number; // seconds
  samplingRate: number; // Hz
  channels: number;
  sampleCount: number;
  /** Object URL for <audio> playback (revoked on reset). */
  playbackUrl: string;
}

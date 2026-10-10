/* ============================================================
   Smart Respiratory Lung Analysis System — Stage 1 mock analysis builder
   ------------------------------------------------------------
   Produces a complete AnalysisResult while the MATLAB engine is
   not yet connected (Stage 1 of the project plan).

   What is REAL in here:
     • waveform / statistics taken from the uploaded recording
     • band-pass filtering, spectral-subtraction preview
     • STFT spectrogram and MFCC of the uploaded signal
     • respiratory-cycle detection preview
     • signal-quality metrics (same formulas as
       analysis/signalQualityMetrics.m)

   What is MOCK / DEMO:
     • class scores, confidence, prediction
     • model comparison metrics, confusion matrix
     • PCA projection, feature importance, 101-feature values
       (time-domain values are computed; the rest are
       deterministic placeholders)

   Every screen labels these values as demo data until the
   FastAPI + MATLAB stages replace them.
   ============================================================ */

import type {
  AnalysisResult,
  ClassScores,
  FeatureEntry,
  FeatureGroup,
  SoundClassKey,
} from "../types/analysis";
import type { ParsedWav } from "../utils/wav";
import {
  bandpassZeroPhase,
  butterworthBandpassDb,
  computeMfcc,
  computeSpectrogram,
  detectRespiratorySegments,
  designBandpassFir,
  downsample,
  firBandpassDb,
  signalStats,
  spectralDenoise,
} from "../utils/dsp";
import { gaussianFrom, hashString, mulberry32 } from "../utils/random";

/* ------------------------------------------------------------
   Class definitions (mirrors the trained label space)
   ------------------------------------------------------------ */

export const CLASS_LABELS: {
  key: SoundClassKey;
  label: string;
  short: string;
}[] = [
  { key: "normal", label: "Normal", short: "Normal" },
  { key: "crackle", label: "Crackle", short: "Crackle" },
  { key: "wheeze", label: "Wheeze", short: "Wheeze" },
  { key: "crackleWheeze", label: "Crackle + Wheeze", short: "C + W" },
];

const INTERPRETATIONS: Record<SoundClassKey, { text: string; label: string }> =
  {
    normal: {
      label: "normal respiratory pattern",
      text: "Acoustic characteristics consistent with a normal respiratory pattern were detected in the analyzed respiratory recording.",
    },
    crackle: {
      label: "crackling",
      text: "Acoustic characteristics associated with crackling sounds were detected in the analyzed respiratory recording.",
    },
    wheeze: {
      label: "wheezing",
      text: "Acoustic characteristics associated with wheezing were detected in the analyzed respiratory recording.",
    },
    crackleWheeze: {
      label: "crackling and wheezing",
      text: "Acoustic characteristics associated with both crackling and wheezing were detected in the analyzed respiratory recording.",
    },
  };

/* ------------------------------------------------------------
   Feature catalogue — 101 engineered acoustic features
   (names mirror the MATLAB feature extractors exactly)
   ------------------------------------------------------------ */

const TIME_FEATURES = [
  "Mean",
  "Std",
  "Variance",
  "RMS",
  "Peak",
  "CrestFactor",
  "Energy",
  "MeanAbsolute",
  "ZeroCrossingRate",
  "Skewness",
  "Kurtosis",
  "Entropy",
  "DynamicRange",
  "Duration",
];

const FREQUENCY_FEATURES = [
  "DominantFrequency",
  "SpectralCentroid",
  "SpectralSpread",
  "SpectralSkewness",
  "SpectralKurtosis",
  "SpectralRolloff",
  "SpectralFlatness",
  "SpectralEntropy",
  "BandEnergy_100_250",
  "BandEnergy_250_500",
  "BandEnergy_500_1000",
  "BandEnergy_1000_1500",
  "BandEnergy_1500_2000",
  "BandEnergy_2000_2500",
];

const STFT_FEATURES = [
  "STFT_Centroid_Mean",
  "STFT_Centroid_Std",
  "STFT_DominantFreq_Mean",
  "STFT_DominantFreq_Std",
  "SpectralFlux_Mean",
  "SpectralFlux_Std",
  "STFT_Entropy_Mean",
  "STFT_Entropy_Std",
  "STFT_TimeDuration",
];

const MFCC_FEATURES = Array.from({ length: 13 }, (_, i) =>
  ["Mean", "Std", "DeltaMean", "DeltaStd"].map(
    (stat) => `MFCC${i + 1}_${stat}`
  )
).flat();

const WAVELET_FEATURES = [
  "WaveletApproxEnergy",
  ...Array.from({ length: 5 }, (_, i) => `WaveletDetailEnergy_L${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `WaveletEntropy_L${i + 1}`),
  "WaveletGlobalEntropy",
];

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    key: "time",
    label: "Time-domain",
    count: TIME_FEATURES.length,
    description:
      "Amplitude statistics, energy, crest factor, zero-crossing rate and higher-order moments of the respiratory cycle.",
  },
  {
    key: "frequency",
    label: "Frequency-domain",
    count: FREQUENCY_FEATURES.length,
    description:
      "Spectral centroid, spread, rolloff, flatness and relative band energies across the respiratory range.",
  },
  {
    key: "stft",
    label: "STFT / time-frequency",
    count: STFT_FEATURES.length,
    description:
      "Frame-wise spectral statistics: dominant frequency, spectral flux and time-frequency entropy.",
  },
  {
    key: "mfcc",
    label: "MFCC",
    count: MFCC_FEATURES.length,
    description:
      "13 mel-frequency cepstral coefficients with mean, standard deviation and delta statistics (26-filter mel bank).",
  },
  {
    key: "wavelet",
    label: "Wavelet",
    count: WAVELET_FEATURES.length,
    description:
      "sym8 multi-resolution decomposition: approximation/detail energies and entropies across 5 levels.",
  },
];

const ALL_FEATURES: { name: string; group: string }[] = [
  ...TIME_FEATURES.map((name) => ({ name, group: "Time-domain" })),
  ...FREQUENCY_FEATURES.map((name) => ({ name, group: "Frequency-domain" })),
  ...STFT_FEATURES.map((name) => ({ name, group: "STFT / time-frequency" })),
  ...MFCC_FEATURES.map((name) => ({ name, group: "MFCC" })),
  ...WAVELET_FEATURES.map((name) => ({ name, group: "Wavelet" })),
];

/** Scale used to give each feature family plausible demo magnitudes. */
const GROUP_SCALE: Record<string, number> = {
  "Time-domain": 0.5,
  "Frequency-domain": 0.2,
  "STFT / time-frequency": 0.35,
  MFCC: 12,
  Wavelet: 0.6,
};

/* ------------------------------------------------------------
   Signal-quality metrics (same formulas as MATLAB)
   ------------------------------------------------------------ */

function qualityBetween(original: Float64Array, processed: Float64Array) {
  const n = Math.min(original.length, processed.length);
  let errSq = 0;
  let sigSq = 0;
  let oo = 0;
  let pp = 0;

  const o = new Float64Array(n);
  const p = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    o[i] = original[i];
    p[i] = processed[i];
    oo += o[i];
    pp += p[i];
  }
  const mo = oo / n;
  const mp = pp / n;
  for (let i = 0; i < n; i++) {
    o[i] -= mo;
    p[i] -= mp;
  }

  let cov = 0;
  let vo = 0;
  let vp = 0;
  for (let i = 0; i < n; i++) {
    const e = o[i] - p[i];
    errSq += e * e;
    sigSq += p[i] * p[i];
    cov += o[i] * p[i];
    vo += o[i] * o[i];
    vp += p[i] * p[i];
  }

  const mse = errSq / n;
  const rmse = Math.sqrt(mse);
  const snr = 10 * Math.log10((sigSq / n + 1e-12) / (errSq / n + 1e-12));
  const correlation = cov / (Math.sqrt(vo) * Math.sqrt(vp) + 1e-12);

  return { snr, rmse, correlation, mse };
}

/* ------------------------------------------------------------
   Series helpers
   ------------------------------------------------------------ */

function toTimeSeries(
  x: Float64Array | Float32Array,
  fs: number,
  target = 900
): { time: number[]; amplitude: number[] } {
  const { indices, values } = downsample(x, target);
  return {
    time: indices.map((i) => i / fs),
    amplitude: values,
  };
}

/* ------------------------------------------------------------
   Mock builder
   ------------------------------------------------------------ */

export function buildMockAnalysis(
  fileName: string,
  wav: ParsedWav
): AnalysisResult {
  const fs = wav.samplingRate;
  const samples = Float64Array.from(wav.samples);
  const duration = wav.duration;
  const rand = mulberry32(hashString(fileName) || 12345);

  /* ---- DSP previews on the real signal -------------------- */
  const filtered = bandpassZeroPhase(samples, fs, 100, Math.min(2500, 0.45 * fs));
  const denoised = spectralDenoise(filtered);
  const stats = signalStats(samples);
  const quality = qualityBetween(samples, denoised);

  const status: "Good" | "Fair" | "Poor" =
    quality.snr >= 12 ? "Good" : quality.snr >= 6 ? "Fair" : "Poor";

  const lowHz = 100;
  const highHz = Math.min(2500, 0.45 * fs);
  const firTaps = designBandpassFir(fs, lowHz, highHz);

  /* ---- Segmentation preview ------------------------------ */
  const segments = detectRespiratorySegments(samples, fs);

  /* ---- Prediction (deterministic demo) ------------------- */
  const targetConfidence = 0.76 + rand() * 0.18;
  const classIndex = Math.floor(rand() * CLASS_LABELS.length) % 4;
  const predicted = CLASS_LABELS[classIndex];

  const rawOthers = Array.from({ length: 3 }, () => 0.4 + rand());
  const othersSum = rawOthers.reduce((a, b) => a + b, 0);
  const scores: ClassScores = {
    normal: 0,
    crackle: 0,
    wheeze: 0,
    crackleWheeze: 0,
  };
  let oi = 0;
  for (const cls of CLASS_LABELS) {
    if (cls.key === predicted.key) {
      scores[cls.key] = targetConfidence;
    } else {
      scores[cls.key] = ((1 - targetConfidence) * rawOthers[oi]) / othersSum;
      oi += 1;
    }
  }
  const confidence = Math.round(targetConfidence * 1000) / 10;

  /* ---- Feature values ------------------------------------ */
  const timeValues = computeTimeFeatures(samples, fs);
  const features: FeatureEntry[] = ALL_FEATURES.map(({ name, group }) => {
    let value: number;
    const scale = GROUP_SCALE[group] ?? 1;

    if (group === "Time-domain") {
      value = timeValues[name] ?? gaussianFrom(rand) * scale;
    } else if (name === "STFT_TimeDuration") {
      value = duration;
    } else {
      const magnitude = Math.abs(gaussianFrom(rand)) * scale;
      value = group === "MFCC" ? gaussianFrom(rand) * scale : magnitude;
    }
    if (!Number.isFinite(value)) value = 0;
    return {
      name,
      group,
      value: Math.round(value * 1e6) / 1e6,
    };
  });

  const distribution = FEATURE_GROUPS.map((g) => {
    const members = features.filter((f) => f.group === g.label);
    const abs = members.map((f) => Math.abs(f.value));
    const mean = abs.reduce((a, b) => a + b, 0) / (abs.length || 1);
    const variance =
      abs.reduce((a, b) => a + (b - mean) ** 2, 0) / (abs.length || 1);
    return {
      group: g.label,
      mean: Math.round(mean * 1e4) / 1e4,
      spread: Math.round(Math.sqrt(variance) * 1e4) / 1e4,
    };
  });

  /* ---- Spectrogram / MFCC of the filtered signal ---------- */
  const spec = computeSpectrogram(filtered, fs, 512, 256, 150);
  const mfcc = computeMfcc(filtered, fs, 13, 26, 512, 256, 150);

  /* ---- PCA (demo clusters) -------------------------------- */
  const pcaPoints = CLASS_LABELS.flatMap((cls) => {
    const center = PCA_CENTERS[cls.key];
    return Array.from({ length: 55 }, () => ({
      pc1: center[0] + gaussianFrom(rand) * 0.62,
      pc2: center[1] + gaussianFrom(rand) * 0.62,
      label: cls.label,
      classKey: cls.key,
    }));
  });

  /* ---- Reliability (demo) --------------------------------- */
  const stability = 0.78 + rand() * 0.16;
  const agreement = 0.64 + rand() * 0.22;
  const remaining = 1 - agreement;
  const otherIndices = [0, 1, 2, 3].filter((i) => i !== classIndex);
  const otherShares = otherIndices.map(() => rand());
  const otherSum = otherShares.reduce((a, b) => a + b, 0) || 1;
  const classAgreement = CLASS_LABELS.map((cls, i) => ({
    label: cls.label,
    share:
      i === classIndex
        ? agreement
        : Math.round((remaining * otherShares[otherIndices.indexOf(i)]) / otherSum * 1000) / 1000,
  }));
  // Renormalize to counter rounding drift.
  const shareTotal = classAgreement.reduce((a, c) => a + c.share, 0);
  const dominant = classAgreement[classIndex];
  dominant.share = Math.round((dominant.share + (1 - shareTotal)) * 1000) / 1000;

  return {
    meta: {
      fileName,
      analyzedAt: new Date().toISOString(),
      isDemo: true,
      engine:
        "Stage 1 demo — signal previews computed locally in the browser; model outputs are mock data pending the MATLAB inference engine.",
    },
    prediction: {
      key: predicted.key,
      label: predicted.label,
      confidence,
      interpretation: INTERPRETATIONS[predicted.key].text,
    },
    classScores: scores,
    signalQuality: {
      status,
      snr: Math.round(quality.snr * 10) / 10,
      rmse: Math.round(quality.rmse * 1e6) / 1e6,
      correlation: Math.round(quality.correlation * 1e4) / 1e4,
      mse: Math.round(quality.mse * 1e8) / 1e8,
      rms: Math.round(stats.rms * 1e6) / 1e6,
      peakAmplitude: Math.round(stats.peak * 1e6) / 1e6,
      duration: Math.round(duration * 100) / 100,
      samplingRate: fs,
      sampleCount: wav.sampleCount,
    },
    waveform: toTimeSeries(samples, fs, 1400),
    preprocessing: {
      stages: [
        {
          key: "original",
          label: "Original signal",
          description:
            "Acquired respiratory audio with DC component removed, prior to any filtering.",
          signal: toTimeSeries(samples, fs, 700),
        },
        {
          key: "filtered",
          label: "Band-pass filtered",
          description:
            "Zero-phase 100–2500 Hz band-pass filtering suppresses frequency components outside the respiratory sound range.",
          signal: toTimeSeries(filtered, fs, 700),
        },
        {
          key: "denoised",
          label: "Denoised",
          description:
            "Spectral-subtraction denoising preview reduces broadband noise while preserving transient signal characteristics (wavelet denoising runs in MATLAB).",
          signal: toTimeSeries(denoised, fs, 700),
        },
      ],
      filterResponse: buildFilterResponse(fs, highHz, firTaps),
      filterSpec: {
        bandpass: `${lowHz} – ${Math.round(highHz)} Hz`,
        iirType: "Butterworth IIR, order 4 (zero-phase filtfilt)",
        firType: "Windowed-sinc FIR, order 100 (Hamming)",
        zeroPhase: true,
      },
      metrics: {
        snr: Math.round(quality.snr * 10) / 10,
        rmse: Math.round(quality.rmse * 1e6) / 1e6,
        correlation: Math.round(quality.correlation * 1e4) / 1e4,
        mse: Math.round(quality.mse * 1e8) / 1e8,
      },
    },
    segmentation: {
      segments,
      selectedSegmentId: Math.min(2, segments.length),
      cyclesAnalyzed: segments.length,
      method:
        "Automatic envelope-based cycle detection preview (ICBHI annotation files are unavailable for arbitrary uploads — production segmentation is planned for the MATLAB inference entry point).",
    },
    features: {
      total: 101,
      groups: FEATURE_GROUPS,
      features,
      mfcc: {
        rows: mfcc.values.map((_, i) => `C${i + 1}`),
        cols: mfcc.values[0].map((_, i) => `${i + 1}`),
        values: mfcc.values,
      },
      spectrogram: spec,
      wavelet: buildWaveletDemo(rand),
      distribution,
    },
    pca: {
      points: pcaPoints,
      explainedVariance: [0.386, 0.241],
      cumulativeVariance: 0.627,
    },
    machineLearning: {
      models: DEMO_MODELS.map((m) => ({
        ...m,
        isActive: m.key === "ensemble",
      })),
      activeModel: "Feature Ensemble",
      confusionMatrix: {
        labels: CLASS_LABELS.map((c) => c.short),
        matrix: DEMO_CONFUSION,
      },
    },
    explainability: {
      topFeatures: buildFeatureImportance(),
    },
    reliability: {
      segmentsAnalyzed: segments.length,
      modelStatus: "Ready",
      predictionStability: Math.round(stability * 1000) / 1000,
      agreementRate: Math.round(agreement * 1000) / 1000,
      classAgreement,
    },
  };
}

/* ------------------------------------------------------------
   Sub-builders
   ------------------------------------------------------------ */

const PCA_CENTERS: Record<SoundClassKey, [number, number]> = {
  normal: [2.2, 0.9],
  crackle: [-1.7, 1.8],
  wheeze: [-0.8, -1.8],
  crackleWheeze: [1.5, -1.3],
};

interface DemoModel {
  key: string;
  name: string;
  shortName: string;
  isActive: boolean;
  metrics: {
    accuracy: number;
    balancedAccuracy: number;
    precision: number;
    recall: number;
    f1: number;
  };
}

/** Fixed, clearly-labelled demonstration metrics (not real results). */
const DEMO_MODELS: DemoModel[] = [
  {
    key: "svm",
    name: "SVM",
    shortName: "SVM",
    isActive: false,
    metrics: {
      accuracy: 0.781,
      balancedAccuracy: 0.742,
      precision: 0.756,
      recall: 0.734,
      f1: 0.741,
    },
  },
  {
    key: "rf",
    name: "Random Forest",
    shortName: "RF",
    isActive: false,
    metrics: {
      accuracy: 0.824,
      balancedAccuracy: 0.788,
      precision: 0.801,
      recall: 0.782,
      f1: 0.79,
    },
  },
  {
    key: "knn",
    name: "k-NN",
    shortName: "k-NN",
    isActive: false,
    metrics: {
      accuracy: 0.746,
      balancedAccuracy: 0.715,
      precision: 0.728,
      recall: 0.706,
      f1: 0.714,
    },
  },
  {
    key: "ensemble",
    name: "Feature Ensemble",
    shortName: "Ensemble",
    isActive: true,
    metrics: {
      accuracy: 0.853,
      balancedAccuracy: 0.819,
      precision: 0.834,
      recall: 0.812,
      f1: 0.821,
    },
  },
];

/** Demo confusion matrix on a held-out patient-wise test split. */
const DEMO_CONFUSION = [
  [143, 8, 6, 3],
  [8, 100, 9, 5],
  [5, 9, 107, 6],
  [2, 6, 7, 81],
];

function buildFilterResponse(
  fs: number,
  highHz: number,
  taps: Float64Array
): { frequency: number; iirDb: number; firDb: number }[] {
  const maxFreq = Math.min(fs / 2, 4000);
  const points: { frequency: number; iirDb: number; firDb: number }[] = [];
  const n = 240;
  for (let i = 0; i <= n; i++) {
    const f = (i / n) * maxFreq;
    points.push({
      frequency: Math.round(f),
      iirDb: Math.round(butterworthBandpassDb(f, fs, 100, highHz) * 100) / 100,
      firDb: Math.round(firBandpassDb(f, fs, taps) * 100) / 100,
    });
  }
  return points;
}

function buildWaveletDemo(rand: () => number) {
  const labels = ["Approx (A5)", "D5", "D4", "D3", "D2", "D1"];
  const base = [0.46, 0.17, 0.13, 0.11, 0.08, 0.05];
  const energies = base.map(
    (b) => Math.round(Math.max(0.01, b + gaussianFrom(rand) * 0.03) * 1000) / 1000
  );
  const sum = energies.reduce((a, b) => a + b, 0);
  const normalized = energies.map((e) => Math.round((e / sum) * 1000) / 1000);
  const entropies = labels.map(
    (_, i) => Math.round((4.2 - i * 0.42 + gaussianFrom(rand) * 0.25) * 100) / 100
  );
  return { labels, energies: normalized, entropies };
}

function buildFeatureImportance() {
  const names: [string, string, number][] = [
    ["SpectralCentroid", "Frequency-domain", 0.148],
    ["MFCC3_Mean", "MFCC", 0.131],
    ["WaveletDetailEnergy_L1", "Wavelet", 0.117],
    ["STFT_Centroid_Mean", "STFT / time-frequency", 0.104],
    ["MFCC1_DeltaStd", "MFCC", 0.092],
    ["BandEnergy_500_1000", "Frequency-domain", 0.079],
    ["SpectralRolloff", "Frequency-domain", 0.066],
    ["CrestFactor", "Time-domain", 0.058],
    ["MFCC2_Mean", "MFCC", 0.049],
    ["WaveletEntropy_L2", "Wavelet", 0.041],
    ["ZeroCrossingRate", "Time-domain", 0.034],
    ["SpectralFlatness", "Frequency-domain", 0.028],
  ];
  return names.map(([name, group, importance]) => ({
    name,
    group,
    importance,
  }));
}

/** Real time-domain statistics for the 14 time-domain features. */
function computeTimeFeatures(x: Float64Array, fs: number): Record<string, number> {
  const stats = signalStats(x);
  const n = x.length;

  let meanAbs = 0;
  let signChanges = 0;
  let prevSign = 0;
  let skew = 0;
  let kurt = 0;
  let min = Infinity;
  let max = -Infinity;
  const power: number[] = [];

  for (let i = 0; i < n; i++) {
    const v = x[i];
    meanAbs += Math.abs(v);
    const s = v > 0 ? 1 : v < 0 ? -1 : 0;
    if (prevSign !== 0 && s !== 0 && s !== prevSign) signChanges += 1;
    if (s !== 0) prevSign = s;
    min = Math.min(min, v);
    max = Math.max(max, v);
    const z = (v - stats.mean) / (stats.std + 1e-12);
    skew += z ** 3;
    kurt += z ** 4;
    power.push(v * v);
  }

  skew /= n;
  kurt /= n;

  const totalPower = power.reduce((a, b) => a + b, 0) + 1e-12;
  let entropy = 0;
  for (const p of power) {
    const prob = p / totalPower;
    if (prob > 0) entropy -= prob * Math.log2(prob);
  }

  return {
    Mean: stats.mean,
    Std: stats.std,
    Variance: stats.std ** 2,
    RMS: stats.rms,
    Peak: stats.peak,
    CrestFactor: stats.crest,
    Energy: stats.energy,
    MeanAbsolute: meanAbs / n,
    ZeroCrossingRate: signChanges / Math.max(n - 1, 1),
    Skewness: skew,
    Kurtosis: kurt,
    Entropy: entropy,
    DynamicRange: max - min,
    Duration: n / fs,
  };
}

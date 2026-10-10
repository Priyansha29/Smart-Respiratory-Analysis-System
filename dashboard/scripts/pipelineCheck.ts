/* Stage-1 pipeline check (no browser required).
 *
 * Reads the generated sample WAV, runs the mock analysis builder
 * and asserts that every section of the AnalysisResult contract is
 * populated with sane values.
 *
 * Usage: npm run check-pipeline
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseWav } from "../src/utils/wav";
import { buildMockAnalysis } from "../src/data/mockAnalysis";
import type { AnalysisResult } from "../src/types/analysis";

// npm scripts run from the dashboard package root.
const wavPath = join(process.cwd(), "samples", "demo_respiratory_recording.wav");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  const status = ok ? "PASS" : "FAIL";
  if (!ok) failures += 1;
  console.log(`  [${status}] ${name}${detail ? ` — ${detail}` : ""}`);
}

const buffer = readFileSync(wavPath);
const wav = parseWav(
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
);

console.log("\n== WAV parsing ==");
check("WAV parsed", wav !== null);
if (!wav) process.exit(1);
check("Sampling rate 4000 Hz", wav.samplingRate === 4000, `${wav.samplingRate}`);
check("Duration ~8.5 s", Math.abs(wav.duration - 8.5) < 0.05, wav.duration.toFixed(3));
check("Mono", wav.channels === 1);
check("Samples decoded", wav.samples.length === wav.sampleCount, `${wav.sampleCount}`);

console.log("\n== Analysis result contract ==");
const result: AnalysisResult = buildMockAnalysis("demo_respiratory_recording.wav", wav);

check("Marked as demo", result.meta.isDemo === true);
check(
  "Prediction class valid",
  ["normal", "crackle", "wheeze", "crackleWheeze"].includes(result.prediction.key),
  `${result.prediction.label} @ ${result.prediction.confidence}%`
);
check("Confidence in 0-100", result.prediction.confidence > 0 && result.prediction.confidence <= 100);
check(
  "Class scores sum ≈ 1",
  Math.abs(Object.values(result.classScores).reduce((a, b) => a + b, 0) - 1) < 1e-6
);
check(
  "No NaN in class scores",
  Object.values(result.classScores).every((v) => Number.isFinite(v))
);
check(
  "Interpretation avoids diagnosis",
  !/asthma|copd|pneumonia|diagnos/i.test(result.prediction.interpretation),
  "no disease language"
);
check(
  "Confidence labelled model-derived",
  !/probability of/i.test(result.prediction.interpretation)
);

console.log("\n== Signal quality ==");
const q = result.signalQuality;
check("SNR finite", Number.isFinite(q.snr), `${q.snr} dB`);
check("RMSE finite", Number.isFinite(q.rmse), `${q.rmse}`);
check("Correlation in [-1,1]", q.correlation >= -1 && q.correlation <= 1, `${q.correlation}`);
check("RMS > 0", q.rms > 0, `${q.rms}`);
check("Status valid", ["Good", "Fair", "Poor"].includes(q.status), q.status);

console.log("\n== Waveform ==");
check("Time axis non-empty", result.waveform.time.length > 100, `${result.waveform.time.length} pts`);
check("Amplitude aligned", result.waveform.time.length === result.waveform.amplitude.length);
check("No NaN amplitudes", result.waveform.amplitude.every((v) => Number.isFinite(v)));
check(
  "Time increases monotonically",
  result.waveform.time.every((t, i) => i === 0 || t >= result.waveform.time[i - 1])
);

console.log("\n== Preprocessing ==");
check("3 stages present", result.preprocessing.stages.length === 3);
check(
  "Stage series non-empty",
  result.preprocessing.stages.every((s) => s.signal.amplitude.length > 50)
);
check(
  "Stage series NaN-free",
  result.preprocessing.stages.every((s) => s.signal.amplitude.every((v) => Number.isFinite(v)))
);
check(
  "Filter response has IIR + FIR",
  result.preprocessing.filterResponse.length > 100 &&
    result.preprocessing.filterResponse.every((p) => Number.isFinite(p.iirDb) && Number.isFinite(p.firDb)),
  `${result.preprocessing.filterResponse.length} pts`
);
const iirAt100 = result.preprocessing.filterResponse.find((p) => p.frequency === 100);
check("Butterworth ~-3dB at band edge", iirAt100 ? Math.abs(iirAt100.iirDb + 3) < 1.5 : false, iirAt100 ? `${iirAt100.iirDb} dB` : "n/a");

console.log("\n== Segmentation ==");
const seg = result.segmentation;
check("Segments detected", seg.segments.length > 0, `${seg.segments.length} segments`);
check("Cycles analyzed matches", seg.cyclesAnalyzed === seg.segments.length);
check(
  "Segments ordered & inside bounds",
  seg.segments.every(
    (s, i) =>
      s.end > s.start &&
      s.start >= -1e-9 &&
      s.end <= wav.duration + 1e-9 &&
      (i === 0 || s.start >= seg.segments[i - 1].start)
  )
);
check(
  "Phases valid",
  seg.segments.every((s) => s.phase === "Inspiration" || s.phase === "Expiration")
);

console.log("\n== Features ==");
check("101 features", result.features.total === 101);
check("101 entries", result.features.features.length === 101, `${result.features.features.length}`);
check(
  "Group counts sum to 101",
  result.features.groups.reduce((a, g) => a + g.count, 0) === 101
);
check(
  "All feature values finite",
  result.features.features.every((f) => Number.isFinite(f.value))
);
check("Duration feature = recording", Math.abs((result.features.features.find((f) => f.name === "Duration")?.value ?? 0) - wav.duration) < 0.01);
check(
  "MFCC 13 x frames",
  result.features.mfcc.rows.length === 13 && result.features.mfcc.values.length === 13,
  `${result.features.mfcc.values.length} x ${result.features.mfcc.values[0]?.length}`
);
check(
  "Spectrogram populated",
  result.features.spectrogram.times.length > 10 &&
    result.features.spectrogram.frequencies.length > 10,
  `${result.features.spectrogram.values.length} frames × ${result.features.spectrogram.values[0]?.length} bins`
);
check(
  "Spectrogram NaN-free",
  result.features.spectrogram.values.every((row) => row.every((v) => Number.isFinite(v)))
);
check("Wavelet levels = 6", result.features.wavelet.labels.length === 6);
check(
  "Wavelet energies normalized",
  Math.abs(result.features.wavelet.energies.reduce((a, b) => a + b, 0) - 1) < 0.02
);

console.log("\n== PCA / ML / Explainability / Reliability ==");
check("PCA points", result.pca.points.length === 220, `${result.pca.points.length}`);
check(
  "PCA points labelled",
  result.pca.points.every((p) => ["Normal", "Crackle", "Wheeze", "Crackle + Wheeze"].includes(p.label))
);
check("Explained variance sums < 1", result.pca.explainedVariance.reduce((a, b) => a + b, 0) < 1);
check("4 models", result.machineLearning.models.length === 4);
check(
  "One active model",
  result.machineLearning.models.filter((m) => m.isActive).length === 1
);
check("Confusion matrix 4×4", result.machineLearning.confusionMatrix.matrix.length === 4 &&
  result.machineLearning.confusionMatrix.matrix.every((r) => r.length === 4));
const diag = result.machineLearning.confusionMatrix.matrix.reduce((a, r, i) => a + r[i], 0);
const total = result.machineLearning.confusionMatrix.matrix.flat().reduce((a, b) => a + b, 0);
check(
  "Matrix accuracy ≈ ensemble accuracy",
  Math.abs(diag / total - result.machineLearning.models[3].metrics.accuracy) < 0.005,
  `${((diag / total) * 100).toFixed(1)}% vs ${(result.machineLearning.models[3].metrics.accuracy * 100).toFixed(1)}%`
);
check("12 importance entries", result.explainability.topFeatures.length === 12);
check(
  "Importance decreasing",
  result.explainability.topFeatures.every((f, i, arr) => i === 0 || arr[i - 1].importance >= f.importance)
);
check("Reliability segments matches", result.reliability.segmentsAnalyzed === seg.segments.length);
check(
  "Agreement shares sum ≈ 1",
  Math.abs(result.reliability.classAgreement.reduce((a, c) => a + c.share, 0) - 1) < 0.01
);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);

/* ============================================================
   PulmoSense — lightweight DSP helpers
   ------------------------------------------------------------
   These functions produce the VISUAL signal representations shown
   by the dashboard during Stage 1 (browser-computed previews of
   the uploaded recording). They mirror the concepts implemented in
   the MATLAB pipeline (band-pass filtering, denoising, STFT,
   MFCC, respiratory-cycle detection) but they are NOT a
   replacement for the MATLAB analysis engine.

   Model outputs (scores, metrics, PCA …) remain mock data until
   the FastAPI + MATLAB integration stages are completed.
   ============================================================ */

/* ------------------------------------------------------------
   FFT (iterative radix-2, in-place)
   ------------------------------------------------------------ */

export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (n <= 1 || (n & (n - 1)) !== 0) {
    throw new Error("fft: length must be a power of two");
  }

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    const half = len >> 1;

    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const vRe = re[b] * curRe - im[b] * curIm;
        const vIm = re[b] * curIm + im[b] * curRe;
        re[b] = re[a] - vRe;
        im[b] = im[a] - vIm;
        re[a] += vRe;
        im[a] += vIm;
        const nRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nRe;
      }
    }
  }
}

export function hannWindow(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  }
  return w;
}

export function hammingWindow(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1));
  }
  return w;
}

/* ------------------------------------------------------------
   Band-pass FIR design (windowed sinc, mirrors fir1 usage)
   ------------------------------------------------------------ */

export function designBandpassFir(
  fs: number,
  lowHz: number,
  highHz: number,
  order = 100
): Float64Array {
  const n = order + 1;
  const h = new Float64Array(n);
  const center = order / 2;

  for (let i = 0; i < n; i++) {
    const m = i - center;
    if (m === 0) {
      h[i] = (2 * (highHz - lowHz)) / fs;
    } else {
      const t = m / fs;
      h[i] =
        (Math.sin(2 * Math.PI * highHz * t) - Math.sin(2 * Math.PI * lowHz * t)) /
        (Math.PI * m);
    }
    // Hamming window (same family as the MATLAB FIR design).
    h[i] *= 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / order);
  }
  return h;
}

/** Direct convolution with a tap kernel. */
function convolve(x: Float64Array, taps: Float64Array): Float64Array {
  const out = new Float64Array(x.length);
  const m = taps.length;
  const half = m >> 1;
  for (let i = 0; i < x.length; i++) {
    let acc = 0;
    for (let k = 0; k < m; k++) {
      const j = i + k - half;
      if (j >= 0 && j < x.length) acc += x[j] * taps[k];
    }
    out[i] = acc;
  }
  return out;
}

/** Zero-phase band-pass filtering (forward + reverse, like filtfilt). */
export function bandpassZeroPhase(
  x: Float64Array,
  fs: number,
  lowHz = 100,
  highHz = 2500
): Float64Array {
  const hi = Math.min(highHz, 0.45 * fs);
  const taps = designBandpassFir(fs, lowHz, hi);
  const forward = convolve(x, taps);
  const reversed = Float64Array.from(forward).reverse();
  const filteredRev = convolve(reversed, taps);
  return Float64Array.from(filteredRev).reverse();
}

/* ------------------------------------------------------------
   Analytic magnitude responses (for the filter-response chart)
   ------------------------------------------------------------ */

/** 4th-order Butterworth band-pass magnitude (dB) at `freq`. */
export function butterworthBandpassDb(
  freq: number,
  fs: number,
  lowHz = 100,
  highHz = 2500
): number {
  const hi = Math.min(highHz, 0.45 * fs);
  const f = Math.max(freq, 1e-6);
  const omega = (f * f - lowHz * hi) / (f * (hi - lowHz));
  const mag = 1 / Math.sqrt(1 + Math.pow(omega, 8));
  return 20 * Math.log10(mag + 1e-12);
}

/** Windowed-sinc FIR magnitude (dB) evaluated on the frequency grid. */
export function firBandpassDb(
  freq: number,
  fs: number,
  taps: Float64Array
): number {
  let re = 0;
  let im = 0;
  const center = (taps.length - 1) / 2;
  for (let i = 0; i < taps.length; i++) {
    const tau = i - center;
    const w = (2 * Math.PI * freq) / fs;
    re += taps[i] * Math.cos(w * tau);
    im -= taps[i] * Math.sin(w * tau);
  }
  return 20 * Math.log10(Math.hypot(re, im) + 1e-12);
}

/* ------------------------------------------------------------
   Spectral-subtraction denoising preview
   ------------------------------------------------------------ */

/**
 * Overlap-add spectral subtraction: estimates the noise floor per
 * frequency bin (low percentile of magnitudes across frames) and
 * subtracts it, preserving transient structure and phase.
 */
export function spectralDenoise(x: Float64Array): Float64Array {
  const frame = Math.min(1024, 2 ** Math.floor(Math.log2(x.length)));
  if (frame < 64) return x;
  const hop = frame >> 1;
  const nfft = frame;
  const win = hannWindow(frame);
  const frames = Math.max(1, 1 + Math.floor((x.length - frame) / hop));

  const bins = nfft / 2 + 1;
  const mags: { mag: Float64Array; re: Float64Array; im: Float64Array }[] = [];

  for (let f = 0; f < frames; f++) {
    const start = f * hop;
    const re = new Float64Array(nfft);
    const im = new Float64Array(nfft);
    for (let i = 0; i < frame; i++) {
      const idx = start + i;
      re[i] = (idx < x.length ? x[idx] : 0) * win[i];
    }
    fft(re, im);
    const mag = new Float64Array(bins);
    for (let k = 0; k < bins; k++) mag[k] = Math.hypot(re[k], im[k]);
    mags.push({ mag, re, im });
  }

  // Noise floor: 15th percentile per bin across frames.
  const noise = new Float64Array(bins);
  for (let k = 0; k < bins; k++) {
    const col = mags.map((m) => m.mag[k]);
    col.sort((a, b) => a - b);
    noise[k] = col[Math.floor(0.15 * (col.length - 1))];
  }

  const out = new Float64Array(x.length);
  const weight = new Float64Array(x.length);
  const alpha = 1.2; // over-subtraction factor
  const floorRatio = 0.1; // spectral floor

  for (let f = 0; f < frames; f++) {
    const frameData = mags[f];
    const start = f * hop;
    const reOut = new Float64Array(nfft);
    const imOut = new Float64Array(nfft);

    for (let k = 0; k < bins; k++) {
      const mag = frameData.mag[k];
      const reduced = Math.max(mag - alpha * noise[k], floorRatio * mag);
      const scale = mag > 1e-12 ? reduced / mag : 0;
      reOut[k] = frameData.re[k] * scale;
      imOut[k] = frameData.im[k] * scale;
      if (k > 0 && k < nfft / 2) {
        reOut[nfft - k] = reOut[k];
        imOut[nfft - k] = -imOut[k];
      }
    }

    imOut[0] = 0;
    imOut[nfft / 2] = 0;

    // Inverse FFT via the conjugation trick:
    // forward FFT of X*[k] yields N·x[n] for real-valued x.
    for (let k = 0; k < nfft; k++) imOut[k] = -imOut[k];
    fft(reOut, imOut);
    for (let i = 0; i < frame; i++) {
      const idx = start + i;
      if (idx >= out.length) break;
      out[idx] += (reOut[i] / nfft) * win[i];
      weight[idx] += win[i] * win[i];
    }
  }

  for (let i = 0; i < out.length; i++) {
    out[i] = weight[i] > 1e-6 ? out[i] / weight[i] : out[i];
  }
  return out;
}

/* ------------------------------------------------------------
   STFT spectrogram (dB)
   ------------------------------------------------------------ */

export interface Spectrogram {
  frequencies: number[];
  times: number[];
  /** values[frame][bin] in dB */
  values: number[][];
}

export function computeSpectrogram(
  x: Float64Array,
  fs: number,
  frameSize = 512,
  hop = 256,
  maxFrames = 160
): Spectrogram {
  const nfft = 2 ** Math.ceil(Math.log2(frameSize));
  const win = hammingWindow(frameSize);
  const bins = nfft / 2 + 1;

  let frames = Math.max(1, 1 + Math.floor((x.length - frameSize) / hop));
  const stride = frames > maxFrames ? Math.ceil(frames / maxFrames) : 1;
  frames = Math.ceil(frames / stride);

  const frequencies = new Array<number>(bins);
  for (let k = 0; k < bins; k++) frequencies[k] = (k * fs) / nfft;

  const times: number[] = [];
  const values: number[][] = [];

  for (let f = 0; f < frames; f++) {
    const start = f * hop * stride;
    const re = new Float64Array(nfft);
    const im = new Float64Array(nfft);
    for (let i = 0; i < frameSize; i++) {
      const idx = start + i;
      re[i] = (idx < x.length ? x[idx] : 0) * win[i];
    }
    fft(re, im);

    const row = new Array<number>(bins);
    for (let k = 0; k < bins; k++) {
      const mag = Math.hypot(re[k], im[k]) / frameSize;
      row[k] = 20 * Math.log10(mag + 1e-9);
    }
    times.push((start + frameSize / 2) / fs);
    values.push(row);
  }

  return { frequencies, times, values };
}

/* ------------------------------------------------------------
   MFCC (13 coefficients, 26 mel filters — mirrors MATLAB code)
   ------------------------------------------------------------ */

export interface MfccMatrix {
  rows: number; // coefficients
  cols: number; // frames
  values: number[][]; // values[coeff][frame]
}

function hzToMel(f: number): number {
  return 2595 * Math.log10(1 + f / 700);
}
function melToHz(m: number): number {
  return 700 * (10 ** (m / 2595) - 1);
}

export function computeMfcc(
  x: Float64Array,
  fs: number,
  numCoefficients = 13,
  numFilters = 26,
  frameSize = 512,
  hop = 256,
  maxFrames = 160
): MfccMatrix {
  const nfft = 2 ** Math.ceil(Math.log2(frameSize));
  const win = hammingWindow(frameSize);
  const bins = nfft / 2 + 1;

  const melMax = hzToMel(fs / 2);
  const melPoints = Array.from({ length: numFilters + 2 }, (_, i) =>
    (i * melMax) / (numFilters + 1)
  );
  const binPoints = melPoints.map((m) =>
    Math.min(
      nfft / 2,
      Math.max(0, Math.floor(((nfft + 1) * melToHz(m)) / fs))
    )
  );

  let frames = Math.max(1, 1 + Math.floor((x.length - frameSize) / hop));
  const stride = frames > maxFrames ? Math.ceil(frames / maxFrames) : 1;
  frames = Math.ceil(frames / stride);

  const rows = Array.from({ length: numCoefficients }, () =>
    new Array<number>(frames).fill(0)
  );

  for (let f = 0; f < frames; f++) {
    const start = f * hop * stride;
    const re = new Float64Array(nfft);
    const im = new Float64Array(nfft);
    for (let i = 0; i < frameSize; i++) {
      const idx = start + i;
      re[i] = (idx < x.length ? x[idx] : 0) * win[i];
    }
    fft(re, im);

    const power = new Float64Array(bins);
    for (let k = 0; k < bins; k++) {
      power[k] = (re[k] * re[k] + im[k] * im[k]) / nfft;
    }

    // Triangular mel filter bank.
    const logMel = new Float64Array(numFilters);
    for (let m = 0; m < numFilters; m++) {
      const left = binPoints[m];
      const center = binPoints[m + 1];
      const right = binPoints[m + 2];
      let energy = 0;
      for (let k = left; k <= right; k++) {
        let weight = 0;
        if (k <= center && k > left) {
          weight = (k - left) / Math.max(1, center - left);
        } else if (k > center && k < right) {
          weight = (right - k) / Math.max(1, right - center);
        }
        energy += power[k] * weight;
      }
      logMel[m] = Math.log(Math.max(energy, 1e-12));
    }

    // DCT-II over mel energies.
    for (let c = 0; c < numCoefficients; c++) {
      let acc = 0;
      for (let m = 0; m < numFilters; m++) {
        acc += logMel[m] * Math.cos((Math.PI * c * (m + 0.5)) / numFilters);
      }
      rows[c][f] = acc;
    }
  }

  return { rows: numCoefficients, cols: frames, values: rows };
}

/* ------------------------------------------------------------
   Respiratory-cycle detection (envelope based)
   ------------------------------------------------------------
   NOTE: ICBHI training data ships with annotation files, but an
   arbitrary uploaded recording has none. The MATLAB inference
   entry point (Stage 2) will implement the production-grade
   automatic segmentation. The function below provides the
   interface preview used by the dashboard in Stage 1.
   ------------------------------------------------------------ */

export interface DetectedSegment {
  id: number;
  start: number;
  end: number;
  duration: number;
  phase: "Inspiration" | "Expiration";
}

/** Centered moving average with edge tapering. */
function movingAverage(x: Float64Array, window: number): Float64Array {
  const out = new Float64Array(x.length);
  let sum = 0;
  let count = 0;
  const queue: number[] = [];

  for (let i = 0; i < x.length; i++) {
    queue.push(x[i]);
    sum += x[i];
    count += 1;
    if (queue.length > window) {
      sum -= queue.shift() as number;
      count -= 1;
    }
    out[i] = sum / count;
  }
  return out;
}

/** RMS envelope computed with a 40 ms sliding window. */
export function rmsEnvelope(x: Float64Array, fs: number): Float64Array {
  const win = Math.max(8, Math.round(0.04 * fs));
  const hop = Math.max(4, Math.round(0.01 * fs));
  const len = Math.max(1, Math.floor((x.length - win) / hop) + 1);
  const env = new Float64Array(len);
  const times = new Float64Array(len);

  for (let i = 0; i < len; i++) {
    const start = i * hop;
    let acc = 0;
    for (let k = 0; k < win; k++) {
      const v = x[start + k];
      acc += v * v;
    }
    env[i] = Math.sqrt(acc / win);
    times[i] = (start + win / 2) / fs;
  }
  const smoothed = movingAverage(env, 7);
  return smoothed;
}

/** Envelope samples plus their time axis (for plotting). */
export function envelopeSeries(
  x: Float64Array,
  fs: number
): { time: number[]; amplitude: number[] } {
  const hop = Math.max(4, Math.round(0.01 * fs));
  const win = Math.max(8, Math.round(0.04 * fs));
  const len = Math.max(1, Math.floor((x.length - win) / hop) + 1);
  const raw = rmsEnvelope(x, fs);
  const time: number[] = [];
  const amplitude: number[] = [];
  for (let i = 0; i < len; i++) {
    time.push((i * hop + win / 2) / fs);
    amplitude.push(raw[Math.min(i, raw.length - 1)]);
  }
  return { time, amplitude };
}

export function detectRespiratorySegments(
  x: Float64Array,
  fs: number
): DetectedSegment[] {
  const duration = x.length / fs;
  const hop = Math.max(4, Math.round(0.01 * fs));
  const win = Math.max(8, Math.round(0.04 * fs));
  const env = rmsEnvelope(x, fs);

  if (env.length < 8 || duration < 2) {
    return [
      {
        id: 1,
        start: 0,
        end: duration,
        duration,
        phase: "Inspiration",
      },
    ];
  }

  // Normalize envelope.
  let max = 0;
  for (const v of env) max = Math.max(max, v);
  if (max <= 0) {
    return [{ id: 1, start: 0, end: duration, duration, phase: "Inspiration" }];
  }
  const norm = Float64Array.from(env, (v) => v / max);
  // ~250 ms smoothing removes noise-driven wobble so only genuine
  // breathing modulations remain.
  const smoothed = movingAverage(norm, 25);

  const timeAt = (i: number) => (i * hop + win / 2) / fs;
  const minDistance = Math.max(10, Math.round(1.2 / (hop / fs)));
  const threshold = 0.35;

  // Local maxima above threshold with a minimum separation.
  const peaks: number[] = [];
  for (let i = 1; i < smoothed.length - 1; i++) {
    if (
      smoothed[i] >= threshold &&
      smoothed[i] >= smoothed[i - 1] &&
      smoothed[i] > smoothed[i + 1] &&
      (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance)
    ) {
      peaks.push(i);
    }
  }

  if (peaks.length < 2) {
    // Fallback: fixed analysis windows so the UI remains meaningful.
    const windowLen = Math.min(2, Math.max(1, duration / 3));
    const segments: DetectedSegment[] = [];
    let id = 1;
    for (let t = 0; t < duration - 0.2; t += windowLen) {
      const end = Math.min(duration, t + windowLen);
      segments.push({
        id: id,
        start: t,
        end,
        duration: end - t,
        phase: id % 2 === 1 ? "Inspiration" : "Expiration",
      });
      id += 1;
    }
    return segments;
  }

  // Local minima between consecutive peaks (troughs).
  const segments: DetectedSegment[] = [];
  let id = 1;

  for (let p = 0; p < peaks.length; p++) {
    const from = p === 0 ? 0 : peaks[p - 1];
    const to = p === peaks.length - 1 ? smoothed.length - 1 : peaks[p + 1];
    const peak = peaks[p];

    // Trough before the peak.
    let troughBefore = from;
    for (let i = from; i < peak; i++) {
      if (smoothed[i] < smoothed[troughBefore]) troughBefore = i;
    }
    // Trough after the peak.
    let troughAfter = peak;
    for (let i = peak; i <= to; i++) {
      if (smoothed[i] < smoothed[troughAfter]) troughAfter = i;
    }

    const inspStart = timeAt(troughBefore);
    const inspEnd = timeAt(peak);
    const expStart = timeAt(peak);
    const expEnd = timeAt(troughAfter);

    if (inspEnd - inspStart >= 0.35) {
      segments.push({
        id: id++,
        start: inspStart,
        end: inspEnd,
        duration: inspEnd - inspStart,
        phase: "Inspiration",
      });
    }
    if (expEnd - expStart >= 0.35) {
      segments.push({
        id: id++,
        start: expStart,
        end: expEnd,
        duration: expEnd - expStart,
        phase: "Expiration",
      });
    }
  }

  if (segments.length === 0) {
    return [{ id: 1, start: 0, end: duration, duration, phase: "Inspiration" }];
  }

  // Re-number sequentially and clamp to recording bounds.
  return segments
    .map((s, i) => ({
      ...s,
      id: i + 1,
      start: Math.max(0, s.start),
      end: Math.min(duration, s.end),
      duration: Math.max(0, Math.min(duration, s.end) - Math.max(0, s.start)),
    }))
    .filter((s) => s.duration > 0.15);
}

/* ------------------------------------------------------------
   Display helpers
   ------------------------------------------------------------ */

/** Stride-downsamples a signal to at most `target` points. */
export function downsample(
  x: Float32Array | Float64Array,
  target = 1200
): { indices: number[]; values: number[] } {
  const n = x.length;
  if (n <= target) {
    const indices = Array.from({ length: n }, (_, i) => i);
    const values = Array.from(x);
    return { indices, values };
  }
  const stride = n / target;
  const indices: number[] = [];
  const values: number[] = [];
  for (let i = 0; i < target; i++) {
    const idx = Math.floor(i * stride);
    indices.push(idx);
    values.push(x[idx]);
  }
  return { indices, values };
}

/** Basic amplitude statistics of a signal. */
export function signalStats(x: Float64Array | Float32Array) {
  let sum = 0;
  let sumSq = 0;
  let peak = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    sum += v;
    sumSq += v * v;
    peak = Math.max(peak, Math.abs(v));
  }
  const mean = sum / x.length;
  const rms = Math.sqrt(sumSq / x.length);
  let varAcc = 0;
  for (let i = 0; i < x.length; i++) varAcc += (x[i] - mean) ** 2;
  const std = Math.sqrt(varAcc / (x.length - 1 || 1));
  return {
    mean,
    std,
    rms,
    peak,
    crest: peak / (rms + 1e-12),
    energy: sumSq,
  };
}

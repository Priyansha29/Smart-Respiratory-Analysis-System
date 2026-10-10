import styles from "./Hero.module.css";

/**
 * Landing hero: product identity, tagline and a respiratory-themed
 * decorative illustration. Purely presentational — the actual analysis
 * plots live in the cards below and use the uploaded recording.
 */
export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <WaveMotif />

      <div className={styles.content}>
        <span className={styles.emblem} aria-hidden>
          <LungMark />
        </span>

        <p className={styles.eyebrow}>Biomedical signal analysis</p>

        <h1 id="hero-title" className={styles.title}>
          Smart Respiratory Lung Analysis System
        </h1>

        <p className={styles.tagline}>
          Listening deeper. Understanding every breath.
        </p>

        <p className={styles.subtitle}>
          Digital signal processing
          <span className={styles.sep} aria-hidden>
            ·
          </span>
          Respiratory sound classification
          <span className={styles.sep} aria-hidden>
            ·
          </span>
          Explainable machine learning
        </p>
      </div>
    </section>
  );
}

/** Line-art lungs with a trachea and branching bronchi. */
function LungMark() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M32 7v13" />
      <path d="M32 20c-3 0-5.6 1.7-7.6 4.3" />
      <path d="M32 20c3 0 5.6 1.7 7.6 4.3" />
      <path d="M24.4 24.4C19 22 12.4 24.2 10.4 30.2c-2 6-1.4 15.4 1.6 20.4 1.6 2.7 4.7 3.3 7.1 1.4 2.7-2.1 4.2-5.9 4.8-10.9.5-4.1.6-7.7 1.4-11.5" />
      <path d="M39.6 24.4C45 22 51.6 24.2 53.6 30.2c2 6 1.4 15.4-1.6 20.4-1.6 2.7-4.7 3.3-7.1 1.4-2.7-2.1-4.2-5.9-4.8-10.9-.5-4.1-.6-7.7-1.4-11.5" />
    </svg>
  );
}

/**
 * Deterministic sample series for the decorative motif: a burst of dense,
 * non-repeating oscillation under a breath-like amplitude envelope, with a
 * faint jitter floor. This reads as a signal-processing waveform rather than
 * a smooth row of hills. Decorative only — never the analyzed recording.
 */
const WAVE_SAMPLES = buildWaveSamples(240);

function buildWaveSamples(n: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const envelope = Math.pow(Math.sin(Math.PI * t), 0.65);
    const detail =
      Math.sin(t * Math.PI * 37.3 + 0.4) * 0.5 +
      Math.sin(t * Math.PI * 61.7 + 1.9) * 0.28 +
      Math.sin(t * Math.PI * 97.1 + 2.7) * 0.14;
    const body = Math.sin(t * Math.PI * 23.3) * 0.2;
    const floor = Math.sin(t * 517.3) * 0.05 + Math.sin(t * 291.7 + 0.7) * 0.04;
    const v = envelope * (detail + body) + floor * 0.7;
    return Math.max(-1, Math.min(1, v));
  });
}

function toSignalPath(samples: number[], width: number, height: number): string {
  const mid = height / 2;
  const amp = height * 0.46;
  return samples
    .map((v, i) => {
      const x = (i / (samples.length - 1)) * width;
      const y = mid - v * amp;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Full-width respiratory-signal motif used as decoration. */
function WaveMotif() {
  return (
    <div className={styles.motif} aria-hidden>
      <svg viewBox="0 0 1200 140" preserveAspectRatio="none" fill="none">
        <path className={styles.motifAxis} d="M0 70 H1200" stroke="currentColor" />
        <path
          className={styles.motifLine}
          d={toSignalPath(WAVE_SAMPLES, 1200, 140)}
          stroke="currentColor"
        />
      </svg>
    </div>
  );
}

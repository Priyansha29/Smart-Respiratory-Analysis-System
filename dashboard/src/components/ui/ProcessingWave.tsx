import styles from "./ProcessingWave.module.css";

/** Fixed, deterministic bar heights that evoke a breath envelope. */
const BAR_HEIGHTS = [
  0.22, 0.3, 0.44, 0.62, 0.82, 0.95, 0.72, 0.5, 0.34, 0.46, 0.66, 0.86, 0.98,
  0.78, 0.56, 0.38, 0.28, 0.4, 0.58, 0.8, 0.92, 0.7, 0.48, 0.32, 0.24, 0.38,
  0.6, 0.84, 0.96, 0.74, 0.52, 0.36,
];

interface ProcessingWaveProps {
  /** Status copy, e.g. "Analyzing on the MATLAB engine…". */
  label: string;
}

/**
 * Animated waveform shown ONLY while the backend is analysing. It is a
 * decorative loading indicator — it does not represent the recording
 * signal, and is labelled as such for clarity.
 */
export function ProcessingWave({ label }: ProcessingWaveProps) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.wave} aria-hidden>
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={i}
            className={styles.bar}
            style={{
              height: `${h * 100}%`,
              animationDelay: `${(i % 12) * 70}ms`,
            }}
          />
        ))}
      </div>
      <div className={styles.label}>
        <span className={styles.spinner} aria-hidden />
        {label}
      </div>
      <p className={styles.note}>Animated indicator — not the recording signal</p>
    </div>
  );
}

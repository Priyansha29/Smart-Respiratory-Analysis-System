import type { SignalQuality as Quality } from "../../types/analysis";
import { fixed } from "../../utils/format";
import { Stat } from "../ui/Stat";
import styles from "./SignalQuality.module.css";

const STATUS_HINT: Record<Quality["status"], string> = {
  Good: "Suitable for analysis",
  Fair: "Usable, moderate residual noise",
  Poor: "Noise may affect results",
};

/**
 * Compact signal quality card — status plus the objective metrics
 * computed by the preprocessing stage.
 */
export function SignalQualityCard({ quality }: { quality: Quality }) {
  const tone =
    quality.status === "Good"
      ? styles.good
      : quality.status === "Fair"
        ? styles.fair
        : styles.poor;

  return (
    <div>
      <div className={styles.statusRow}>
        <span className={`${styles.dot} ${tone}`} aria-hidden />
        <span className={styles.statusValue}>{quality.status}</span>
        <span className={styles.statusText}>
          {STATUS_HINT[quality.status]}
        </span>
      </div>

      <div className={styles.grid}>
        <Stat
          label="SNR"
          value={fixed(quality.snr, 1)}
          unit="dB"
          hint="Signal-to-noise ratio"
          tone={quality.snr >= 12 ? "accent" : "warn"}
        />
        <Stat
          label="RMSE"
          value={fixed(quality.rmse, 4)}
          hint="Original vs denoised"
        />
        <Stat
          label="Correlation"
          value={fixed(quality.correlation, 3)}
          hint="Waveform preservation"
        />
        <Stat
          label="RMS"
          value={fixed(quality.rms, 4)}
          hint="Mean signal amplitude"
          small
        />
        <Stat
          label="Peak amplitude"
          value={fixed(quality.peakAmplitude, 4)}
          hint="Maximum |x|"
          small
        />
        <Stat
          label="Sampling rate"
          value={quality.samplingRate.toLocaleString("en-US")}
          unit="Hz"
          hint={`${fixed(quality.duration, 2)} s · ${quality.sampleCount.toLocaleString("en-US")} samples`}
          small
        />
      </div>
    </div>
  );
}

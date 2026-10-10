import type { ClassScores, SoundClassKey } from "../../types/analysis";
import { CLASS_LABELS } from "../../data/mockAnalysis";
import styles from "./ClassScoreChart.module.css";

interface ClassScoreChartProps {
  scores: ClassScores;
  predictedKey: SoundClassKey;
}

/**
 * Horizontal score bars for the four respiratory sound classes.
 * Scores are normalized classifier outputs, not probabilities.
 */
export function ClassScoreChart({ scores, predictedKey }: ClassScoreChartProps) {
  const max = Math.max(
    0.0001,
    ...CLASS_LABELS.map((c) => scores[c.key])
  );

  return (
    <div className={styles.chart}>
      <div className={styles.head}>
        <span className={styles.headLabel}>Class scores</span>
        <span className={styles.headHint}>
          Normalized classifier output per respiratory sound class
        </span>
      </div>

      {CLASS_LABELS.map((cls) => {
        const value = scores[cls.key] ?? 0;
        const isActive = cls.key === predictedKey;
        return (
          <div className={styles.row} key={cls.key}>
            <span
              className={`${styles.name} ${isActive ? styles.nameActive : ""}`}
            >
              <span>{cls.label}</span>
              {isActive && <span className={styles.selectedTag}>TOP</span>}
            </span>
            <div className={styles.rail}>
              <div
                className={`${styles.fill} ${isActive ? styles.fillActive : ""}`}
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
            <span
              className={`${styles.value} ${isActive ? styles.valueActive : ""}`}
            >
              {(value * 100).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

import type { AnalysisResult } from "../../types/analysis";
import { Badge } from "../ui/Badge";
import { ClassScoreChart } from "./ClassScoreChart";
import styles from "./AnalysisResult.module.css";

interface AnalysisResultPanelProps {
  result: AnalysisResult;
}

/**
 * Level-1 result surface: detected respiratory sound pattern,
 * model-derived confidence, per-class scores and a plain-language
 * interpretation. Deliberately free of DSP detail.
 */
export function AnalysisResultPanel({ result }: AnalysisResultPanelProps) {
  const { prediction, classScores } = result;

  return (
    <div className={styles.result}>
      <div className={styles.topRow}>
        <div>
          <div className={styles.prompt}>
            Detected Respiratory Sound Pattern
          </div>
          <div className={styles.prediction}>
            <span className={styles.classMark} aria-hidden>
              <BreathIcon />
            </span>
            <div>
              <div className={styles.classLabel}>{prediction.label}</div>
              <div className={styles.classHint}>
                Aggregate classification across analyzed respiratory cycles
              </div>
            </div>
          </div>
        </div>

        <div className={styles.confidence}>
          <div className={styles.confidenceLabel}>
            Model-derived confidence
            <Badge variant="primary" title="Not a medically calibrated probability">
              score-derived
            </Badge>
          </div>
          <div className={styles.confidenceValue}>
            {prediction.confidence.toFixed(1)}%
          </div>
          <div className={styles.confidenceTrack}>
            <div
              className={styles.confidenceFill}
              style={{ width: `${prediction.confidence}%` }}
            />
          </div>
          <p className={styles.confidenceNote}>
            Derived from the classifier score distribution. This is not a
            medically calibrated probability of any condition.
          </p>
        </div>
      </div>

      <ClassScoreChart scores={classScores} predictedKey={prediction.key} />

      <div className={styles.interpretation}>
        <span className={styles.interpretationHead}>What this means</span>
        {prediction.interpretation}
      </div>
    </div>
  );
}

function BreathIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12h3l1.5-4 2.4 9 2-13 2.2 11 1.5-5 1.3 2H21" />
    </svg>
  );
}

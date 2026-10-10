import { Badge } from "../../ui/Badge";
import type { AnalysisResult } from "../../../types/analysis";
import { CLASS_COLORS } from "../../../theme/chartColors";
import { percent } from "../../../utils/format";
import { CLASS_LABELS } from "../../../data/mockAnalysis";
import shared from "./shared.module.css";

/**
 * RELIABILITY — everything that qualifies how much the result
 * should be trusted: signal quality, confidence, segment coverage,
 * stability and model status.
 */
export function ReliabilityTab({ result }: { result: AnalysisResult }) {
  const { signalQuality, prediction, reliability, machineLearning } = result;

  const statusVariant =
    reliability.modelStatus === "Ready"
      ? "good"
      : reliability.modelStatus === "Degraded"
        ? "warn"
        : "alert";

  const qualityVariant =
    signalQuality.status === "Good"
      ? "good"
      : signalQuality.status === "Fair"
        ? "warn"
        : "alert";

  return (
    <div className={shared.stack}>
      <div className={shared.explain}>
        <span className={shared.explainTitle}>About this view</span>
        This view summarises how trustworthy the displayed result is: the
        quality of the input signal, the score-derived confidence, how stable
        the prediction was across analyzed respiratory cycles and the status of
        the model.
      </div>

      <div className={shared.kpis}>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Signal quality</span>
          <span className={shared.kpiValue}>
            <Badge variant={qualityVariant} dot>
              {signalQuality.status}
            </Badge>
          </span>
          <span className={shared.kpiHint}>
            SNR {signalQuality.snr.toFixed(1)} dB
          </span>
        </div>

        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Model confidence</span>
          <span className={shared.kpiValue}>
            {prediction.confidence.toFixed(1)}%
          </span>
          <span className={shared.kpiHint}>Model-derived (score-based)</span>
        </div>

        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Segments analyzed</span>
          <span className={shared.kpiValue}>
            {reliability.segmentsAnalyzed}
          </span>
          <span className={shared.kpiHint}>Respiratory segments</span>
        </div>

        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Prediction stability</span>
          <span className={shared.kpiValue}>
            {percent(reliability.predictionStability)}
          </span>
          <span className={shared.kpiHint}>Across cycles</span>
        </div>

        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Agreement rate</span>
          <span className={shared.kpiValue}>
            {percent(reliability.agreementRate)}
          </span>
          <span className={shared.kpiHint}>Cycles matching aggregate</span>
        </div>

        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Model</span>
          <span
            className={shared.kpiValue}
            style={{ fontSize: "var(--fs-md)" }}
          >
            {machineLearning.activeModel}
          </span>
          <span className={shared.kpiHint}>
            <Badge variant={statusVariant} dot>
              {reliability.modelStatus}
            </Badge>
          </span>
        </div>
      </div>

      {/* ---- Per-class agreement ---- */}
      <div>
        <div className={shared.subhead} style={{ marginBottom: 12 }}>
          <span>Prediction agreement across segments</span>
          <span className={shared.subheadHint}>
            Share of analyzed segments classified into each class
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reliability.classAgreement.map((entry) => {
            const cls = CLASS_LABELS.find((c) => c.label === entry.label);
            const color = cls ? CLASS_COLORS[cls.key] : "#0D7770";
            return (
              <div
                key={entry.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px minmax(0,1fr) 54px",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--fs-sm)",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  {entry.label}
                </span>
                <div
                  style={{
                    height: 12,
                    background: "var(--bg-sunken)",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${entry.share * 100}%`,
                      height: "100%",
                      background: color,
                      borderRadius: 6,
                      transition: "width 600ms var(--ease)",
                    }}
                  />
                </div>
                <span
                  style={{
                    textAlign: "right",
                    fontSize: "var(--fs-sm)",
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--text)",
                  }}
                >
                  {percent(entry.share, 0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={shared.grid2}>
        <div className={shared.explain}>
          <span className={shared.explainTitle}>Confidence wording</span>
          Confidence is described as <strong>model-derived</strong> or{" "}
          <strong>score-derived</strong> confidence. It is not a medically
          calibrated probability and must not be interpreted as one.
        </div>
        <div className={shared.explain}>
          <span className={shared.explainTitle}>
            {result.meta.isDemo ? "Demo data" : "Computed from this recording"}
          </span>
          {result.meta.isDemo
            ? "Stability, agreement and status values are illustrative until patient-level evaluation results are returned by the MATLAB pipeline."
            : "Segments analysed, prediction stability and class agreement are computed from this recording's automatic segmentation. Patient-level evaluation across recordings is reported separately."}
        </div>
      </div>
    </div>
  );
}

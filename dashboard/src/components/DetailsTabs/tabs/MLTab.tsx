import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalysisResult } from "../../../types/analysis";
import { Badge } from "../../ui/Badge";
import { percent } from "../../../utils/format";
import { ChartTooltip } from "../../charts/ChartTooltip";
import shared from "./shared.module.css";

const METRIC_SERIES = [
  { key: "accuracy", label: "Accuracy", color: "#2C5EAD" },
  { key: "balancedAccuracy", label: "Balanced accuracy", color: "#1591DC" },
  { key: "f1", label: "Macro F1", color: "#00B7CD" },
] as const;

/**
 * MACHINE LEARNING — model comparison, metric table and the
 * confusion matrix of the active (ensemble) classifier.
 */
export function MLTab({ result }: { result: AnalysisResult }) {
  const { models, activeModel, confusionMatrix } = result.machineLearning;

  const chartData = models.map((m) => ({
    name: m.shortName,
    accuracy: m.metrics.accuracy,
    balancedAccuracy: m.metrics.balancedAccuracy,
    f1: m.metrics.f1,
  }));

  const maxCell = Math.max(
    1,
    ...confusionMatrix.matrix.flat()
  );

  return (
    <div className={shared.stack}>
      <div className={shared.explain}>
        <span className={shared.explainTitle}>About this view</span>
        Four classifiers are trained on the engineered feature vectors and
        compared on a patient-wise held-out test split. The ensemble combines
        their outputs for the reported prediction.
      </div>

      <div className={shared.row} style={{ justifyContent: "space-between" }}>
        <span className={shared.subhead}>
          Model comparison <Badge variant="primary">{activeModel}</Badge>
        </span>
        <span className={shared.demoTag}>
          {result.meta.isDemo
            ? "Demonstration metrics"
            : "Measured on held-out test set"}
        </span>
      </div>

      {/* ---- Comparison table ---- */}
      <div className={shared.tableWrap}>
        <table className={shared.table}>
          <thead>
            <tr>
              <th>Model</th>
              <th style={{ textAlign: "right" }}>Accuracy</th>
              <th style={{ textAlign: "right" }}>Balanced acc.</th>
              <th style={{ textAlign: "right" }}>Macro precision</th>
              <th style={{ textAlign: "right" }}>Macro recall</th>
              <th style={{ textAlign: "right" }}>Macro F1</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr
                key={m.shortName}
                style={
                  m.isActive
                    ? { background: "var(--ps-primary-weak)" }
                    : undefined
                }
              >
                <td>
                  <strong style={{ color: "var(--text)" }}>{m.name}</strong>
                </td>
                <td className={shared.num}>{percent(m.metrics.accuracy)}</td>
                <td className={shared.num}>
                  {percent(m.metrics.balancedAccuracy)}
                </td>
                <td className={shared.num}>{percent(m.metrics.precision)}</td>
                <td className={shared.num}>{percent(m.metrics.recall)}</td>
                <td className={shared.num}>{percent(m.metrics.f1)}</td>
                <td>
                  {m.isActive ? (
                    <Badge variant="primary">Active</Badge>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>Baseline</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={shared.grid2}>
        {/* ---- Metric chart ---- */}
        <div>
          <div className={shared.subhead} style={{ marginBottom: 10 }}>
            <span>Model metrics</span>
            <span className={shared.subheadHint}>Accuracy · balanced · F1</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -6, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid stroke="#E3EAF3" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="name" tickLine={false} interval={0} />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                tickLine={false}
                width={48}
              />
              <Tooltip
                isAnimationActive={false}
                content={
                  <ChartTooltip
                    labels={{
                      accuracy: "Accuracy",
                      balancedAccuracy: "Balanced accuracy",
                      f1: "Macro F1",
                    }}
                    formatters={{
                      accuracy: (v) => percent(Number(v)),
                      balancedAccuracy: (v) => percent(Number(v)),
                      f1: (v) => percent(Number(v)),
                    }}
                  />
                }
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#56688a" }}
                iconSize={9}
              />
              {METRIC_SERIES.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.color}
                  isAnimationActive={false}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={22}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ---- Confusion matrix ---- */}
        <div>
          <div className={shared.subhead} style={{ marginBottom: 10 }}>
            <span>Confusion matrix</span>
            <span className={shared.subheadHint}>
              rows = actual · columns = predicted
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "separate",
                borderSpacing: 3,
                width: "100%",
                fontSize: "var(--fs-xs)",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "4px 8px",
                      color: "var(--text-muted)",
                      fontWeight: 700,
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Actual ↓ / Predicted →
                  </th>
                  {confusionMatrix.labels.map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: "center",
                        padding: "4px 6px",
                        color: "var(--text-muted)",
                        fontWeight: 700,
                        fontSize: 10,
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {confusionMatrix.matrix.map((row, r) => (
                  <tr key={confusionMatrix.labels[r]}>
                    <td
                      style={{
                        padding: "4px 8px",
                        color: "var(--text-secondary)",
                        fontWeight: 650,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {confusionMatrix.labels[r]}
                    </td>
                    {row.map((value, c) => {
                      const intensity = value / maxCell;
                      const isDiagonal = r === c;
                      return (
                        <td
                          key={c}
                          style={{
                            textAlign: "center",
                            padding: "10px 6px",
                            borderRadius: 6,
                            fontWeight: isDiagonal ? 750 : 600,
                            fontVariantNumeric: "tabular-nums",
                            background: isDiagonal
                              ? `rgba(44, 94, 173, ${0.12 + intensity * 0.72})`
                              : `rgba(223, 48, 28, ${intensity * 0.28})`,
                            color: isDiagonal
                              ? intensity > 0.45
                                ? "#fff"
                                : "var(--text)"
                              : intensity > 0.3
                                ? "#fff"
                                : "var(--text-secondary)",
                          }}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={shared.explain}>
        <span className={shared.explainTitle}>
          {result.meta.isDemo ? "Demo data" : "Dataset-level metrics"}
        </span>
        {result.meta.isDemo ? (
          <>
            The metrics and confusion matrix shown here are illustrative
            demonstration values so the interface can be evaluated before the
            MATLAB training outputs are connected. They are not measured model
            performance.
          </>
        ) : (
          <>
            These values are measured on the patient-wise held-out test split of
            the ICBHI dataset during MATLAB training — they are dataset-level
            model performance, not the score for this individual recording. The
            per-recording prediction is shown in the result panel above.
          </>
        )}
      </div>
    </div>
  );
}

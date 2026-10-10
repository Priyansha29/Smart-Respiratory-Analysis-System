import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalysisResult } from "../../../types/analysis";
import { fixed } from "../../../utils/format";
import { ChartTooltip } from "../../charts/ChartTooltip";
import shared from "./shared.module.css";

const GROUP_COLORS: Record<string, string> = {
  "Time-domain": "#2C5EAD",
  "Frequency-domain": "#1591DC",
  "STFT / time-frequency": "#00B7CD",
  MFCC: "#4BB8FA",
  Wavelet: "#00B7CD",
};

/**
 * EXPLAINABILITY — feature importance ranking with an honest,
 * non-causal framing.
 */
export function ExplainabilityTab({ result }: { result: AnalysisResult }) {
  const top = [...result.explainability.topFeatures].sort(
    (a, b) => a.importance - b.importance
  );

  const maxImportance = Math.max(
    ...result.explainability.topFeatures.map((f) => f.importance)
  );

  return (
    <div className={shared.stack}>
      <div className={shared.explain}>
        <span className={shared.explainTitle}>About this view</span>
        Feature importance indicates which extracted acoustic characteristics
        contributed most strongly to the model's prediction. Values come from
        predictor/permutation importance computed over the training features.
      </div>

      <div className={shared.row} style={{ justifyContent: "space-between" }}>
        <span className={shared.subhead}>Top important features</span>
        <span className={shared.demoTag}>Demo ranking</span>
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={top}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke="#E3EAF3" strokeDasharray="3 4" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, maxImportance * 1.05]}
            tickFormatter={(v: number) => v.toFixed(2)}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={186}
            tickLine={false}
            tick={{ fontSize: 10.5 }}
          />
          <Tooltip
            isAnimationActive={false}
            content={
              <ChartTooltip
                title="Feature"
                labels={{ importance: "Importance", group: "Group" }}
                formatters={{ importance: (v) => fixed(Number(v), 4) }}
              />
            }
          />
          <Bar
            dataKey="importance"
            isAnimationActive={false}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
          >
            {top.map((f) => (
              <Cell key={f.name} fill={GROUP_COLORS[f.group] ?? "#2C5EAD"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className={shared.legend}>
        {Object.entries(GROUP_COLORS)
          .filter(([group]) =>
            result.explainability.topFeatures.some((f) => f.group === group)
          )
          .map(([group, color]) => (
            <span className={shared.legendItem} key={group}>
              <span className={shared.legendDot} style={{ background: color }} />
              {group}
            </span>
          ))}
      </div>

      <div className={shared.grid2}>
        <div className={shared.explain}>
          <span className={shared.explainTitle}>How to read this</span>
          A higher value means the model's predictions deteriorated more when
          that feature was disturbed. It reflects the model's reliance on the
          feature — it does <strong>not</strong> imply causal or clinical
          importance for a disease.
        </div>
        <div className={shared.explain}>
          <span className={shared.explainTitle}>Demo data</span>
          Feature names are taken from the real 101-feature extractor; the
          importance values are placeholders until{" "}
          <code>analyzeFeatureImportance</code> results are served by the API.
        </div>
      </div>
    </div>
  );
}

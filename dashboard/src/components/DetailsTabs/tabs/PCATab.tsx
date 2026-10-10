import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { AnalysisResult } from "../../../types/analysis";
import { CLASS_LABELS } from "../../../data/mockAnalysis";
import { CLASS_COLORS } from "../../../theme/chartColors";
import { percent } from "../../../utils/format";
import { ChartTooltip } from "../../charts/ChartTooltip";
import shared from "./shared.module.css";

/**
 * PCA / FEATURE SPACE — 2-D projection of the 101-dimensional
 * feature representation, coloured by respiratory sound class.
 */
export function PCATab({ result }: { result: AnalysisResult }) {
  const { points, explainedVariance, cumulativeVariance } = result.pca;

  const byClass = CLASS_LABELS.map((cls) => ({
    key: cls.key,
    label: cls.label,
    color: CLASS_COLORS[cls.key],
    points: points.filter((p) => p.classKey === cls.key),
  }));

  const varianceData = [
    { name: "PC1", value: explainedVariance[0] },
    { name: "PC2", value: explainedVariance[1] },
    {
      name: "Remaining PCs",
      value: Math.max(0, 1 - (explainedVariance[0] + explainedVariance[1])),
    },
  ];

  return (
    <div className={shared.stack}>
      <div className={shared.explain}>
        <span className={shared.explainTitle}>About this view</span>
        PCA projects the high-dimensional feature representation into a lower-dimensional
        space for visualization. Each point is one analyzed respiratory cycle;
        colour indicates its respiratory sound class.
      </div>

      <div className={shared.kpis}>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>PC1 variance</span>
          <span className={shared.kpiValue}>
            {percent(explainedVariance[0])}
          </span>
          <span className={shared.kpiHint}>First principal component</span>
        </div>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>PC2 variance</span>
          <span className={shared.kpiValue}>
            {percent(explainedVariance[1])}
          </span>
          <span className={shared.kpiHint}>Second principal component</span>
        </div>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Cumulative</span>
          <span className={shared.kpiValue}>{percent(cumulativeVariance)}</span>
          <span className={shared.kpiHint}>Captured by 2 components</span>
        </div>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Plotted cycles</span>
          <span className={shared.kpiValue}>{points.length}</span>
          <span className={shared.kpiHint}>Feature vectors shown</span>
        </div>
      </div>

      <div className={shared.grid2}>
        <div>
          <div className={shared.subhead} style={{ marginBottom: 10 }}>
            <span>PC1 vs PC2</span>
            <div className={shared.legend}>
              {byClass.map((c) => (
                <span className={shared.legendItem} key={c.key}>
                  <span className={shared.legendDot} style={{ background: c.color }} />
                  {c.label}
                </span>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 8, right: 12, left: -6, bottom: 4 }}>
              <CartesianGrid stroke="#E3EAF3" strokeDasharray="3 4" />
              <XAxis
                dataKey="pc1"
                type="number"
                name="PC1"
                tickLine={false}
                label={{
                  value: "PC1",
                  position: "insideBottom",
                  offset: -2,
                  style: { fill: "#8496b0", fontSize: 10 },
                }}
              />
              <YAxis
                dataKey="pc2"
                type="number"
                name="PC2"
                tickLine={false}
                width={52}
                label={{
                  value: "PC2",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#8496b0", fontSize: 10 },
                }}
              />
              <ZAxis range={[16, 16]} />
              <Tooltip
                isAnimationActive={false}
                cursor={{ strokeDasharray: "3 3", stroke: "#B9C7DB" }}
                content={
                  <ChartTooltip
                    title="Respiratory cycle"
                    labels={{ pc1: "PC1", pc2: "PC2", label: "Class" }}
                    formatters={{
                      pc1: (v) => Number(v).toFixed(3),
                      pc2: (v) => Number(v).toFixed(3),
                    }}
                  />
                }
              />
              {byClass.map((c) => (
                <Scatter
                  key={c.key}
                  name={c.label}
                  data={c.points}
                  fill={c.color}
                  fillOpacity={0.78}
                  isAnimationActive={false}
                  shape="circle"
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className={shared.stack} style={{ gap: "var(--sp-4)" }}>
          <div>
            <div className={shared.subhead} style={{ marginBottom: 10 }}>
              <span>Explained variance</span>
              <span className={shared.subheadHint}>Share of total variance</span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart
                data={varianceData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid stroke="#E3EAF3" strokeDasharray="3 4" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={92}
                  tickLine={false}
                />
                <Tooltip
                  isAnimationActive={false}
                  content={
                    <ChartTooltip
                      labels={{ value: "Explained variance" }}
                      formatters={{ value: (v) => percent(Number(v)) }}
                    />
                  }
                />
                <Bar
                  dataKey="value"
                  isAnimationActive={false}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={26}
                >
                  {varianceData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={["#2C5EAD", "#1591DC", "#C4E2F5"][i]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={shared.explain}>
            <span className={shared.explainTitle}>Interpretation</span>
            The first two principal components capture{" "}
            {percent(cumulativeVariance)} of the variance in the engineered
            feature space. Separation between coloured clusters indicates that
            the classes are distinguishable in this reduced representation;
            overlapping regions correspond to cycles the classifier finds
            ambiguous.
          </div>

          <div className={shared.explain}>
            <span className={shared.explainTitle}>Demo data</span>
            Projection points are synthetic demo clusters with realistic
            structure. After integration, this view is populated from the PCA
            fitted during MATLAB training.
          </div>
        </div>
      </div>
    </div>
  );
}

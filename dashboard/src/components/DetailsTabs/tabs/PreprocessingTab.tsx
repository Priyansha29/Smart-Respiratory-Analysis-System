import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AnalysisResult,
  FilterResponsePoint,
  PreprocessStageKey,
} from "../../../types/analysis";
import { fixed } from "../../../utils/format";
import { ChartTooltip } from "../../charts/ChartTooltip";
import shared from "./shared.module.css";

const STAGE_COLORS: Record<PreprocessStageKey, string> = {
  original: "#8496b0",
  filtered: "#1591DC",
  denoised: "#2C5EAD",
};

/**
 * Accept both the intended array of points and a legacy object-of-arrays
 * ({ frequency[], iirDb[], firDb[] }) that an older MATLAB worker emitted,
 * so the view never crashes on an unexpected shape.
 */
function normalizeFilterResponse(
  raw: FilterResponsePoint[] | unknown
): FilterResponsePoint[] {
  if (Array.isArray(raw)) {
    return raw as FilterResponsePoint[];
  }
  if (
    raw !== null &&
    typeof raw === "object" &&
    Array.isArray((raw as { frequency?: unknown }).frequency)
  ) {
    const obj = raw as {
      frequency: number[];
      iirDb?: number[];
      firDb?: number[];
    };
    return obj.frequency.map((frequency, i) => ({
      frequency,
      iirDb: obj.iirDb?.[i] ?? 0,
      firDb: obj.firDb?.[i] ?? 0,
    }));
  }
  return [];
}

/**
 * PREPROCESSING — original / band-pass filtered / denoised signal,
 * FIR vs IIR filter design comparison and signal-quality metrics.
 */
export function PreprocessingTab({ result }: { result: AnalysisResult }) {
  const { stages, filterResponse, filterSpec, metrics } =
    result.preprocessing;
  const [stage, setStage] = useState<PreprocessStageKey>("denoised");

  const active = stages.find((s) => s.key === stage) ?? stages[0];
  const chartData = active.signal.time.map((t, i) => ({
    t,
    a: active.signal.amplitude[i],
  }));

  const response = normalizeFilterResponse(filterResponse).filter(
    (_, i) => i % 2 === 0
  );

  return (
    <div className={shared.stack}>
      <div className={shared.explain}>
        <span className={shared.explainTitle}>About this view</span>
        The preprocessing chain removes DC offset, restricts the spectrum to the
        respiratory sound range and suppresses noise while preserving transient
        acoustic events such as crackles.
      </div>

      {/* ---- Stage comparison ---- */}
      <div>
        <div className={shared.subhead} style={{ marginBottom: 10 }}>
          <span>Signal at each processing stage</span>
          <div className={shared.seg} role="tablist">
            {stages.map((s) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={stage === s.key}
                className={`${shared.segBtn} ${stage === s.key ? shared.segBtnActive : ""}`}
                onClick={() => setStage(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 10, left: -6, bottom: 0 }}
          >
            <CartesianGrid stroke="#E3EAF3" strokeDasharray="3 4" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: number) => v.toFixed(1)}
              tickLine={false}
            />
            <YAxis tickFormatter={(v: number) => v.toFixed(2)} tickLine={false} width={52} />
            <Tooltip
              isAnimationActive={false}
              content={
                <ChartTooltip
                  labelFormatter={(l) => `Time ${Number(l).toFixed(3)} s`}
                  labels={{ a: "Amplitude" }}
                  formatters={{ a: (v) => Number(v).toFixed(4) }}
                />
              }
            />
            <ReferenceLine y={0} stroke="#D2DDED" />
            <Line
              type="monotone"
              dataKey="a"
              stroke={STAGE_COLORS[stage]}
              strokeWidth={1.1}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>

        <p className={shared.kpiHint} style={{ marginTop: 8 }}>
          {active.description}
        </p>
      </div>

      {/* ---- Filter design ---- */}
      <div className={shared.grid2}>
        <div>
          <div className={shared.subhead} style={{ marginBottom: 10 }}>
            <span>Filter frequency response</span>
            <span className={shared.subheadHint}>Magnitude (dB) vs frequency</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart
              data={response}
              margin={{ top: 8, right: 10, left: -6, bottom: 0 }}
            >
              <CartesianGrid stroke="#E3EAF3" strokeDasharray="3 4" vertical={false} />
              <XAxis
                dataKey="frequency"
                type="number"
                domain={[0, "dataMax"]}
                tickFormatter={(v: number) => `${v}`}
                tickLine={false}
                label={{
                  value: "Frequency (Hz)",
                  position: "insideBottom",
                  offset: -2,
                  style: { fill: "#8496b0", fontSize: 10 },
                }}
              />
              <YAxis
                domain={[-100, 5]}
                tickFormatter={(v: number) => `${v}`}
                tickLine={false}
                width={46}
              />
              <Tooltip
                isAnimationActive={false}
                content={
                  <ChartTooltip
                    labelFormatter={(l) => `${Number(l)} Hz`}
                    labels={{ iirDb: "Butterworth IIR", firDb: "FIR" }}
                    formatters={{
                      iirDb: (v) => `${Number(v).toFixed(1)} dB`,
                      firDb: (v) => `${Number(v).toFixed(1)} dB`,
                    }}
                  />
                }
              />
              <ReferenceLine y={-3} stroke="#C4E2F5" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="iirDb"
                stroke="#2C5EAD"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
                name="iirDb"
              />
              <Line
                type="monotone"
                dataKey="firDb"
                stroke="#FF9100"
                strokeWidth={1.4}
                strokeDasharray="5 3"
                dot={false}
                isAnimationActive={false}
                name="firDb"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className={shared.legend} style={{ marginTop: 8 }}>
            <span className={shared.legendItem}>
              <span className={shared.legendDot} style={{ background: "#2C5EAD" }} />
              Butterworth IIR
            </span>
            <span className={shared.legendItem}>
              <span className={shared.legendDot} style={{ background: "#FF9100" }} />
              Windowed-sinc FIR
            </span>
            <span className={shared.legendItem}>
              <span className={shared.legendDot} style={{ background: "#C4E2F5" }} />
              −3 dB line
            </span>
          </div>
        </div>

        <div className={shared.stack} style={{ gap: "var(--sp-4)" }}>
          <div className={shared.explain}>
            <span className={shared.explainTitle}>Band-pass filtering</span>
            Suppresses frequency components outside the respiratory sound range
            ({filterSpec.bandpass}), removing low-frequency motion artefacts and
            high-frequency sensor hiss.
          </div>
          <div className={shared.explain}>
            <span className={shared.explainTitle}>Denoising</span>
            Reduces noise while preserving transient signal characteristics.
            This preview uses spectral subtraction; the MATLAB pipeline applies
            wavelet denoising.
          </div>

          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Design</th>
                  <th>Type</th>
                  <th>Order</th>
                  <th>Phase</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Butterworth IIR</td>
                  <td>{filterSpec.iirType.split(",")[0]}</td>
                  <td className={shared.num}>4</td>
                  <td>{filterSpec.zeroPhase ? "Zero-phase (filtfilt)" : "Linear"}</td>
                </tr>
                <tr>
                  <td>Windowed FIR</td>
                  <td>Hamming window</td>
                  <td className={shared.num}>100</td>
                  <td>Zero-phase (filtfilt)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---- Quality metrics ---- */}
      <div>
        <div className={shared.subhead} style={{ marginBottom: 10 }}>
          <span>Signal quality metrics</span>
          <span className={shared.demoTag}>Original vs denoised</span>
        </div>
        <div className={shared.kpis}>
          <div className={shared.kpi}>
            <span className={shared.kpiLabel}>SNR</span>
            <span className={shared.kpiValue}>{fixed(metrics.snr, 1)} dB</span>
            <span className={shared.kpiHint}>Signal-to-noise ratio</span>
          </div>
          <div className={shared.kpi}>
            <span className={shared.kpiLabel}>RMSE</span>
            <span className={shared.kpiValue}>{fixed(metrics.rmse, 5)}</span>
            <span className={shared.kpiHint}>Root mean squared error</span>
          </div>
          <div className={shared.kpi}>
            <span className={shared.kpiLabel}>Correlation</span>
            <span className={shared.kpiValue}>{fixed(metrics.correlation, 4)}</span>
            <span className={shared.kpiHint}>Waveform preservation</span>
          </div>
          <div className={shared.kpi}>
            <span className={shared.kpiLabel}>MSE</span>
            <span className={shared.kpiValue}>{fixed(metrics.mse, 7)}</span>
            <span className={shared.kpiHint}>Mean squared error</span>
          </div>
        </div>
      </div>
    </div>
  );
}

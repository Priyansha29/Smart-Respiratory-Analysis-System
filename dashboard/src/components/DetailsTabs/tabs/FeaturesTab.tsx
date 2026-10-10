import { useMemo, useState } from "react";
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
import { Heatmap } from "../../ui/Heatmap";
import { ChartTooltip } from "../../charts/ChartTooltip";
import { fixed } from "../../../utils/format";
import shared from "./shared.module.css";

const GROUP_COLORS: Record<string, string> = {
  "Time-domain": "#0D7770",
  "Frequency-domain": "#0D4946",
  "STFT / time-frequency": "#3E9E92",
  MFCC: "#A8E6CF",
  Wavelet: "#1E8E7E",
};

/**
 * FEATURES — the 101-dimensional engineered acoustic feature
 * representation with spectrogram / MFCC / wavelet views and an
 * expandable feature table.
 */
export function FeaturesTab({ result }: { result: AnalysisResult }) {
  const { total, groups, features, spectrogram, mfcc, wavelet, distribution } =
    result.features;
  const [showTable, setShowTable] = useState(false);

  const spectrogramRows = useMemo(() => {
    const rows = spectrogram.frequencies.map((f) => `${Math.round(f)}`);
    return { rows, cols: spectrogram.times.map((t) => t.toFixed(2)) };
  }, [spectrogram]);

  const spectrogramMatrix = useMemo(() => {
    // values[freqBin][frame] so frequency runs along the Y axis.
    const nFreq = spectrogram.frequencies.length;
    const nFrames = spectrogram.times.length;
    const matrix: number[][] = Array.from({ length: nFreq }, () =>
      new Array<number>(nFrames).fill(0)
    );
    for (let f = 0; f < nFrames; f++) {
      for (let k = 0; k < nFreq; k++) {
        matrix[k][f] = spectrogram.values[f][k];
      }
    }
    return matrix;
  }, [spectrogram]);

  const waveletEnergy = wavelet.labels.map((label, i) => ({
    label,
    energy: wavelet.energies[i],
    entropy: wavelet.entropies[i],
  }));

  return (
    <div className={shared.stack}>
      <div className={shared.explain}>
        <span className={shared.explainTitle}>About this view</span>
        Each respiratory cycle is reduced to a vector of{" "}
        <strong>{total} engineered acoustic features</strong> spanning time,
        frequency, time-frequency, mel-cepstral and wavelet domains. These
        vectors are the input to the machine-learning models.
      </div>

      {/* ---- Feature groups ---- */}
      <div className={shared.kpis}>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Feature vector</span>
          <span className={shared.kpiValue}>{total} features</span>
          <span className={shared.kpiHint}>Per respiratory cycle</span>
        </div>
        {groups.map((g) => (
          <div className={shared.kpi} key={g.key}>
            <span className={shared.kpiLabel}>{g.label}</span>
            <span className={shared.kpiValue}>{g.count}</span>
            <span className={shared.kpiHint}>features</span>
          </div>
        ))}
      </div>

      <div className={shared.grid2}>
        {groups.map((g) => (
          <div className={shared.explain} key={g.key}>
            <span className={shared.explainTitle}>
              {g.label} · {g.count} features
            </span>
            {g.description}
          </div>
        ))}
      </div>

      {/* ---- Spectrogram ---- */}
      <div>
        <div className={shared.subhead} style={{ marginBottom: 10 }}>
          <span>STFT spectrogram</span>
          <span className={shared.subheadHint}>
            Magnitude (dB) · time vs frequency
          </span>
        </div>
        <Heatmap
          rows={spectrogramRows.rows}
          cols={spectrogramRows.cols}
          values={spectrogramMatrix}
          scale="ocean"
          rowZeroAtBottom
          height={260}
          xTitle="Time (s)"
          yTitle="Frequency (Hz)"
          yTicks={7}
          xTicks={8}
          formatValue={(v) => `${v.toFixed(1)} dB`}
        />
      </div>

      {/* ---- MFCC + wavelet ---- */}
      <div className={shared.grid2}>
        <div>
          <div className={shared.subhead} style={{ marginBottom: 10 }}>
            <span>MFCC heatmap</span>
            <span className={shared.subheadHint}>13 coefficients × frames</span>
          </div>
          <Heatmap
            rows={mfcc.rows}
            cols={mfcc.cols}
            values={mfcc.values}
            scale="blues"
            height={240}
            xTitle="Frame index"
            yTitle="Coefficient"
            yTicks={7}
            xTicks={8}
            formatValue={(v) => v.toFixed(1)}
          />
        </div>

        <div>
          <div className={shared.subhead} style={{ marginBottom: 10 }}>
            <span>Wavelet decomposition (sym8)</span>
            <span className={shared.subheadHint}>Relative energy per level</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={waveletEnergy}
              margin={{ top: 8, right: 10, left: -6, bottom: 0 }}
            >
              <CartesianGrid stroke="#E4E1D8" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="label" tickLine={false} interval={0} angle={-14} height={44} textAnchor="end" />
              <YAxis tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} tickLine={false} width={48} />
              <Tooltip
                isAnimationActive={false}
                content={
                  <ChartTooltip
                    labels={{ energy: "Relative energy" }}
                    formatters={{ energy: (v) => `${(Number(v) * 100).toFixed(1)}%` }}
                  />
                }
              />
              <Bar dataKey="energy" isAnimationActive={false} radius={[4, 4, 0, 0]}>
                {waveletEnergy.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#0D7770" : "#A8E6CF"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ---- Distribution ---- */}
      <div>
        <div className={shared.subhead} style={{ marginBottom: 10 }}>
          <span>Feature distribution summary</span>
          <span className={shared.subheadHint}>
            Mean absolute value and spread by feature group
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={distribution}
            margin={{ top: 8, right: 10, left: -6, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid stroke="#E4E1D8" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="group" tickLine={false} interval={0} angle={-10} height={48} textAnchor="end" />
            <YAxis tickLine={false} width={52} />
            <Tooltip
              isAnimationActive={false}
              content={
                <ChartTooltip
                  labels={{ mean: "Mean |value|", spread: "Std deviation" }}
                  formatters={{
                    mean: (v) => fixed(Number(v), 3),
                    spread: (v) => fixed(Number(v), 3),
                  }}
                />
              }
            />
            <Bar dataKey="mean" fill="#0D7770" isAnimationActive={false} radius={[4, 4, 0, 0]} maxBarSize={34} />
            <Bar dataKey="spread" fill="#D9F0F0" isAnimationActive={false} radius={[4, 4, 0, 0]} maxBarSize={34} />
          </BarChart>
        </ResponsiveContainer>
        <div className={shared.legend} style={{ marginTop: 6 }}>
          <span className={shared.legendItem}>
            <span className={shared.legendDot} style={{ background: "#0D7770" }} />
            Mean |value|
          </span>
          <span className={shared.legendItem}>
            <span className={shared.legendDot} style={{ background: "#D9F0F0" }} />
            Std deviation
          </span>
        </div>
      </div>

      {/* ---- Expandable table ---- */}
      <div>
        <div className={shared.subhead}>
          <span>Full feature table</span>
          <button
            type="button"
            className={shared.segBtn}
            onClick={() => setShowTable((v) => !v)}
            style={{ border: "1px solid var(--border-strong)", borderRadius: 6 }}
          >
            {showTable ? "Hide" : "Show"} {features.length} features
          </button>
        </div>

        {showTable && (
          <div
            className={shared.tableWrap}
            style={{ maxHeight: 340, marginTop: 10, overflowY: "auto" }}
          >
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Feature</th>
                  <th>Group</th>
                  <th style={{ textAlign: "right" }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <tr key={f.name}>
                    <td className={shared.mono}>{i + 1}</td>
                    <td className={shared.mono}>{f.name}</td>
                    <td>
                      <span
                        style={{
                          color: GROUP_COLORS[f.group] ?? "#4F6663",
                          fontWeight: 600,
                        }}
                      >
                        {f.group}
                      </span>
                    </td>
                    <td className={shared.num}>{f.value.toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={shared.explain}>
        <span className={shared.explainTitle}>
          {result.meta.isDemo ? "Demo data" : "Computed from this recording"}
        </span>
        {result.meta.isDemo ? (
          <>
            Spectrogram and MFCC heatmaps are computed from the uploaded
            recording in the browser. Individual feature values, like model
            outputs, are demonstration placeholders until the MATLAB feature
            extractor runs through the API.
          </>
        ) : (
          <>
            Feature values, the MFCC heat-map, spectrogram and wavelet breakdown
            are all computed by the MATLAB feature extractor from the uploaded
            recording (band-pass filtered, same preprocessing as training).
          </>
        )}
      </div>
    </div>
  );
}

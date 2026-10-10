import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalysisResult, RespiratorySegment } from "../../../types/analysis";
import { fixed } from "../../../utils/format";
import { ChartTooltip } from "../../charts/ChartTooltip";
import shared from "./shared.module.css";

const PHASE_FILL: Record<RespiratorySegment["phase"], string> = {
  Inspiration: "rgba(62, 158, 146, 0.17)",
  Expiration: "rgba(168, 230, 207, 0.14)",
};

/**
 * SEGMENTATION — detected respiratory cycles over the full
 * recording plus a focused view of the selected cycle.
 */
export function SegmentationTab({ result }: { result: AnalysisResult }) {
  const { segments, selectedSegmentId, cyclesAnalyzed, method } =
    result.segmentation;
  const [selected, setSelected] = useState(selectedSegmentId);

  useEffect(() => {
    setSelected(selectedSegmentId);
  }, [selectedSegmentId, result]);

  const selectedSegment =
    segments.find((s) => s.id === selected) ?? segments[0];

  const fullData = useMemo(
    () =>
      result.waveform.time.map((t, i) => ({
        t,
        a: result.waveform.amplitude[i],
      })),
    [result.waveform]
  );

  const cycleData = useMemo(() => {
    if (!selectedSegment) return [];
    const points: { t: number; a: number }[] = [];
    for (let i = 0; i < result.waveform.time.length; i++) {
      const t = result.waveform.time[i];
      if (t >= selectedSegment.start && t <= selectedSegment.end) {
        points.push({ t, a: result.waveform.amplitude[i] });
      }
    }
    return points;
  }, [result.waveform, selectedSegment]);

  return (
    <div className={shared.stack}>
      <div className={shared.explain}>
        <span className={shared.explainTitle}>About this view</span>
        The recording is divided into respiratory segments (cycles) that are
        analyzed independently. Highlighted bands mark the detected segments;
        selecting one isolates that cycle for inspection.
      </div>

      <div>
        <div className={shared.subhead} style={{ marginBottom: 10 }}>
          <span>Full recording with detected segments</span>
          <div className={shared.legend}>
            <span className={shared.legendItem}>
              <span
                className={shared.legendDot}
                style={{ background: "rgba(62,158,146,0.5)" }}
              />
              Inspiration
            </span>
            <span className={shared.legendItem}>
              <span
                className={shared.legendDot}
                style={{ background: "rgba(168,230,207,0.45)" }}
              />
              Expiration
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={fullData}
            margin={{ top: 6, right: 10, left: -6, bottom: 0 }}
          >
            <CartesianGrid stroke="#E4E1D8" strokeDasharray="3 4" vertical={false} />
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
            {segments.map((seg) => (
              <ReferenceArea
                key={seg.id}
                x1={seg.start}
                x2={seg.end}
                fill={PHASE_FILL[seg.phase]}
                fillOpacity={seg.id === selected ? 1 : 0.65}
                stroke={seg.id === selected ? "#0D7770" : "transparent"}
                strokeWidth={seg.id === selected ? 1.2 : 0}
              />
            ))}
            <Area
              type="monotone"
              dataKey="a"
              stroke="#0D7770"
              strokeWidth={1}
              fill="none"
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className={shared.grid2}>
        {/* ---- Segment list ---- */}
        <div>
          <div className={shared.subhead} style={{ marginBottom: 10 }}>
            <span>Detected segments</span>
            <span className={shared.subheadHint}>
              {cyclesAnalyzed} segments · click to inspect
            </span>
          </div>
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Duration</th>
                  <th>Phase</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((seg) => (
                  <tr
                    key={seg.id}
                    onClick={() => setSelected(seg.id)}
                    style={{
                      cursor: "pointer",
                      background:
                        seg.id === selected ? "var(--ps-primary-weak)" : "",
                    }}
                  >
                    <td className={shared.mono}>{seg.id}</td>
                    <td className={shared.num}>{seg.start.toFixed(3)} s</td>
                    <td className={shared.num}>{seg.end.toFixed(3)} s</td>
                    <td className={shared.num}>{seg.duration.toFixed(3)} s</td>
                    <td>
                      {seg.phase === "Inspiration" ? "Inspiration" : "Expiration"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- Selected cycle ---- */}
        <div>
          <div className={shared.subhead} style={{ marginBottom: 10 }}>
            <span>Selected segment</span>
            <span className={shared.subheadHint}>
              {selectedSegment
                ? `#${selectedSegment.id} · ${selectedSegment.phase}`
                : "—"}
            </span>
          </div>

          {selectedSegment ? (
            <>
              <ResponsiveContainer width="100%" height={148}>
                <AreaChart
                  data={cycleData}
                  margin={{ top: 6, right: 10, left: -6, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="#E4E1D8"
                    strokeDasharray="3 4"
                    vertical={false}
                  />
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
                  <Area
                    type="monotone"
                    dataKey="a"
                    stroke="#0D4946"
                    strokeWidth={1.1}
                    fill="rgba(13,73,70,0.12)"
                    isAnimationActive={false}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <div className={shared.kpis} style={{ marginTop: 12 }}>
                <div className={shared.kpi}>
                  <span className={shared.kpiLabel}>Boundaries</span>
                  <span className={shared.kpiValue}>
                    {selectedSegment.start.toFixed(2)} – {selectedSegment.end.toFixed(2)} s
                  </span>
                  <span className={shared.kpiHint}>Segment start / end</span>
                </div>
                <div className={shared.kpi}>
                  <span className={shared.kpiLabel}>Cycle duration</span>
                  <span className={shared.kpiValue}>
                    {fixed(selectedSegment.duration, 3)} s
                  </span>
                  <span className={shared.kpiHint}>Length of this segment</span>
                </div>
              </div>
            </>
          ) : (
            <p className={shared.kpiHint}>No segment selected.</p>
          )}
        </div>
      </div>

      <div className={shared.explain}>
        <span className={shared.explainTitle}>Segmentation provenance</span>
        {method}
      </div>
    </div>
  );
}

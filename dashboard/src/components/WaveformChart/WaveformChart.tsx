import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeSeries } from "../../types/analysis";
import { ChartTooltip } from "../charts/ChartTooltip";
import styles from "./WaveformChart.module.css";

interface WaveformChartProps {
  waveform: TimeSeries;
  height?: number;
  caption?: string;
}

interface WavePoint {
  t: number;
  a: number;
}

/**
 * Scientific amplitude-vs-time view of the respiratory recording.
 * Supports hover inspection and range zoom via the bottom brush.
 */
export function WaveformChart({
  waveform,
  height = 300,
  caption,
}: WaveformChartProps) {
  const data: WavePoint[] = waveform.time.map((t, i) => ({
    t: Math.round(t * 10000) / 10000,
    a: waveform.amplitude[i],
  }));

  return (
    <div>
      <div className={styles.head}>
        <div className={styles.axes}>
          Amplitude <span className={styles.axesValue}>vs</span> Time (s)
        </div>
        <div className={styles.hint}>
          Drag the range selector to zoom · hover to inspect
        </div>
      </div>

      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 10, left: -6, bottom: 0 }}
          >
            <defs>
              <linearGradient id="psWaveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0D4946" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#0D4946" stopOpacity={0.02} />
              </linearGradient>
            </defs>
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
              tickMargin={6}
            />
            <YAxis
              tickFormatter={(v: number) => v.toFixed(2)}
              tickLine={false}
              width={54}
              domain={["auto", "auto"]}
            />
            <Tooltip
              isAnimationActive={false}
              content={
                <ChartTooltip
                  labelFormatter={(l) => `Time ${Number(l).toFixed(3)} s`}
                  labels={{ a: "Amplitude" }}
                  formatters={{
                    a: (v) => Number(v).toFixed(4),
                  }}
                />
              }
            />
            <ReferenceLine y={0} stroke="#D6D2C6" />
            <Area
              type="monotone"
              dataKey="a"
              stroke="#0D7770"
              strokeWidth={1.1}
              fill="url(#psWaveFill)"
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 3, fill: "#0D7770", stroke: "#fff", strokeWidth: 1.5 }}
            />
            <Brush
              dataKey="t"
              height={24}
              stroke="#D9F0F0"
              fill="#FAF9F5"
              travellerWidth={9}
              tickFormatter={() => ""}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {caption && <p className={styles.caption}>{caption}</p>}
    </div>
  );
}

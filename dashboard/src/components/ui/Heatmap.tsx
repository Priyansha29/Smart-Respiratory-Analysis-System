import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import styles from "./Heatmap.module.css";

type ScaleName = "blues" | "ocean";

const SCALES: Record<ScaleName, number[][]> = {
  // white → pale blue → light blue → primary → deep navy
  blues: [
    [255, 255, 255],
    [196, 226, 245],
    [75, 184, 250],
    [44, 94, 173],
    [14, 34, 84],
  ],
  // deep navy → teal → cyan → pale → white (spectrogram style)
  ocean: [
    [12, 28, 64],
    [11, 91, 140],
    [0, 183, 205],
    [150, 226, 250],
    [250, 253, 255],
  ],
};

function interpolate(
  stops: number[][],
  t: number
): [number, number, number] {
  const clamped = Math.min(1, Math.max(0, t));
  const seg = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  const f = seg - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(p * (sorted.length - 1)))
  );
  return sorted[idx];
}

interface HeatmapProps {
  /** Row labels (vertical axis). */
  rows: string[];
  /** Column labels (horizontal axis). */
  cols: string[];
  /** values[row][col] */
  values: number[][];
  height?: number;
  scale?: ScaleName;
  /** Draw row 0 at the bottom (frequency-style axes). */
  rowZeroAtBottom?: boolean;
  xTitle?: string;
  yTitle?: string;
  /** Tooltip value formatting. */
  formatValue?: (v: number) => string;
  /** Maximum axis label ticks. */
  yTicks?: number;
  xTicks?: number;
}

/**
 * Dense 2-D value matrix renderer (spectrogram / MFCC).
 * Rendered on canvas for performance, with hover inspection.
 */
export function Heatmap({
  rows,
  cols,
  values,
  height = 240,
  scale = "blues",
  rowZeroAtBottom = false,
  xTitle,
  yTitle,
  formatValue = (v) => v.toFixed(1),
  yTicks = 5,
  xTicks = 6,
}: HeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);

  // Track container width.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(Math.max(280, w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bounds = useMemo(() => {
    const flat: number[] = [];
    for (const row of values) for (const v of row) if (Number.isFinite(v)) flat.push(v);
    flat.sort((a, b) => a - b);
    return {
      min: percentile(flat, 0.02),
      max: percentile(flat, 0.98),
    };
  }, [values]);

  // Draw.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const padLeft = yTitle ? 52 : 44;
    const padRight = 14;
    const padTop = 6;
    const padBottom = xTitle ? 34 : 24;

    const cssW = width;
    const cssH = height;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const plotW = cssW - padLeft - padRight;
    const plotH = cssH - padTop - padBottom;
    const nRows = values.length;
    const nCols = values[0]?.length ?? 0;
    if (nRows === 0 || nCols === 0 || plotW <= 0 || plotH <= 0) return;

    const stops = SCALES[scale];
    const span = bounds.max - bounds.min || 1;
    const cellW = plotW / nCols;
    const cellH = plotH / nRows;

    for (let r = 0; r < nRows; r++) {
      const y =
        padTop + (rowZeroAtBottom ? nRows - 1 - r : r) * cellH;
      for (let c = 0; c < nCols; c++) {
        const v = values[r][c];
        if (!Number.isFinite(v)) continue;
        const t = (v - bounds.min) / span;
        const [cr, cg, cb] = interpolate(stops, t);
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.fillRect(
          padLeft + c * cellW,
          y,
          Math.ceil(cellW) + 0.5,
          Math.ceil(cellH) + 0.5
        );
      }
    }

    // Frame.
    ctx.strokeStyle = "rgba(22,35,61,0.14)";
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft + 0.5, padTop + 0.5, plotW - 1, plotH - 1);

    // Axis labels.
    ctx.fillStyle = "#8496b0";
    ctx.font = "10px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";

    const yLabelCount = Math.min(yTicks, nRows);
    for (let i = 0; i < yLabelCount; i++) {
      const frac = yLabelCount === 1 ? 0 : i / (yLabelCount - 1);
      const rowIndex = rowZeroAtBottom
        ? Math.round((1 - frac) * (nRows - 1))
        : Math.round(frac * (nRows - 1));
      const y = padTop + (rowZeroAtBottom ? frac : 1 - frac) * plotH;
      ctx.textAlign = "right";
      ctx.fillText(rows[rowIndex] ?? "", padLeft - 6, y);
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(132,150,176,0.5)";
      ctx.fillRect(padLeft - 3, y, 3, 1);
      ctx.fillStyle = "#8496b0";
    }

    const xLabelCount = Math.min(xTicks, nCols);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < xLabelCount; i++) {
      const frac = xLabelCount === 1 ? 0 : i / (xLabelCount - 1);
      const colIndex = Math.round(frac * (nCols - 1));
      const x = padLeft + frac * plotW;
      ctx.fillText(cols[colIndex] ?? "", x, padTop + plotH + 7);
    }

    // Titles.
    ctx.fillStyle = "#8496b0";
    ctx.font = "10px Inter, system-ui, sans-serif";
    if (xTitle) {
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(xTitle, padLeft + plotW / 2, cssH - 2);
    }
    if (yTitle) {
      ctx.save();
      ctx.translate(11, padTop + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(yTitle, 0, 0);
      ctx.restore();
    }
  }, [values, rows, cols, width, height, scale, bounds, rowZeroAtBottom, xTitle, yTitle, xTicks, yTicks]);

  const handleMove = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const padLeft = yTitle ? 52 : 44;
    const padRight = 14;
    const padTop = 6;
    const padBottom = xTitle ? 34 : 24;
    const plotW = rect.width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const nRows = values.length;
    const nCols = values[0]?.length ?? 0;

    if (
      x < padLeft ||
      x > padLeft + plotW ||
      y < padTop ||
      y > padTop + plotH ||
      nRows === 0 ||
      nCols === 0
    ) {
      setHover(null);
      return;
    }

    const col = Math.min(nCols - 1, Math.floor(((x - padLeft) / plotW) * nCols));
    const frac = (y - padTop) / plotH;
    const row = rowZeroAtBottom
      ? Math.min(nRows - 1, Math.floor((1 - frac) * nRows))
      : Math.min(nRows - 1, Math.floor(frac * nRows));

    const v = values[row]?.[col];
    if (v === undefined || !Number.isFinite(v)) {
      setHover(null);
      return;
    }

    setHover({
      x,
      y,
      label: `${rows[row]} · ${cols[col]} — ${formatValue(v)}`,
    });
  };

  const legendGradient = useMemo(() => {
    const stops = SCALES[scale];
    const parts = stops.map((c, i) => {
      const t = (i / (stops.length - 1)) * 100;
      return `rgb(${c[0]},${c[1]},${c[2]}) ${t}%`;
    });
    return `linear-gradient(90deg, ${parts.join(", ")})`;
  }, [scale]);

  return (
    <div className={styles.root} ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ width: "100%", height: `${height}px` }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      />
      {hover && (
        <div
          className={styles.tooltip}
          style={{ left: hover.x, top: hover.y }}
        >
          {hover.label}
        </div>
      )}
      <div className={styles.legend}>
        <span>{formatValue(bounds.min)}</span>
        <span
          className={styles.legendBar}
          style={{ background: legendGradient }}
        />
        <span>{formatValue(bounds.max)}</span>
      </div>
    </div>
  );
}

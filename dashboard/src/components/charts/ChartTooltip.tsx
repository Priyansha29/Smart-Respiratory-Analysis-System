import type { CSSProperties } from "react";
import styles from "./ChartTooltip.module.css";

export interface TooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  /** Optional heading (e.g. "Time 2.31 s"). */
  title?: string;
  /** dataKey -> friendly label. */
  labels?: Record<string, string>;
  /** dataKey -> formatter. */
  formatters?: Record<string, (value: number | string) => string>;
  /** Derive the heading from the axis label. */
  labelFormatter?: (label: string | number) => string;
}

/** Dark tooltip box shared by the Recharts visuals. */
export function ChartTooltip({
  active,
  payload,
  label,
  title,
  labels,
  formatters,
  labelFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const heading =
    title ??
    (label !== undefined && labelFormatter ? labelFormatter(label) : undefined);

  return (
    <div className={styles.box}>
      {heading && <div className={styles.title}>{heading}</div>}
      {payload.map((entry, i) => {
        const key = String(entry.dataKey ?? entry.name ?? i);
        const format = formatters?.[key];
        const value = format
          ? format(entry.value ?? "")
          : String(entry.value ?? "");
        const friendly = labels?.[key] ?? String(entry.name ?? key);
        return (
          <div className={styles.row} key={`${key}-${i}`}>
            <span className={styles.rowLabel}>
              <span
                className={styles.swatch}
                style={{ background: entry.color } as CSSProperties}
              />
              {friendly}
            </span>
            <span className={styles.rowValue}>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

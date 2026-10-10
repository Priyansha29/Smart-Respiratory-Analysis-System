import type { ReactNode } from "react";
import styles from "./Stat.module.css";

interface StatProps {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  tone?: "default" | "accent" | "alert" | "warn";
  small?: boolean;
}

/** Compact metric display used in detail grids. */
export function Stat({
  label,
  value,
  unit,
  hint,
  tone = "default",
  small = false,
}: StatProps) {
  const toneClass =
    tone === "accent"
      ? styles.accent
      : tone === "alert"
        ? styles.alert
        : tone === "warn"
          ? styles.warn
          : "";

  return (
    <div className={`${styles.stat} ${toneClass}`}>
      <span className={styles.label}>{label}</span>
      <span className={styles.valueRow}>
        <span
          className={`${styles.value} ${small ? styles.valueSmall : ""}`}
        >
          {value}
        </span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

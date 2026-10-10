import type { ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeVariant =
  | "neutral"
  | "primary"
  | "cyan"
  | "good"
  | "warn"
  | "alert"
  | "warm";

interface BadgeProps {
  variant?: BadgeVariant;
  /** Show a leading status dot. */
  dot?: boolean;
  /** Pulse the status dot (live systems). */
  pulse?: boolean;
  children: ReactNode;
  title?: string;
}

export function Badge({
  variant = "neutral",
  dot = false,
  pulse = false,
  children,
  title,
}: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`} title={title}>
      {dot && (
        <span
          className={`${styles.dot} ${pulse ? styles.dotPulse : ""}`}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}

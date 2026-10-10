import type { ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  /** Small uppercase section label. */
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned header element (buttons, badges, legends). */
  action?: ReactNode;
  children: ReactNode;
  /** Remove body padding for full-bleed charts/tables. */
  flush?: boolean;
  tight?: boolean;
  className?: string;
}

/**
 * Base surface used across the dashboard: subtle border, soft
 * shadow, restrained typography.
 */
export function Card({
  eyebrow,
  title,
  subtitle,
  action,
  children,
  flush = false,
  tight = false,
  className,
}: CardProps) {
  const hasHeader = Boolean(eyebrow || title || action);
  const rootClass = [styles.card, flush ? styles.cardFlush : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={rootClass}>
      {hasHeader && (
        <header
          className={[styles.header, flush ? styles.headerFlush : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <div className={styles.headerText}>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h2 className={styles.title}>{title}</h2>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {action && <div className={styles.action}>{action}</div>}
        </header>
      )}
      <div
        className={[styles.body, tight ? styles.bodyTight : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </section>
  );
}

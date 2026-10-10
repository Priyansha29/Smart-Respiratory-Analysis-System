import type { ReactNode } from "react";
import styles from "./Notice.module.css";

/**
 * Research disclaimer — visible but unobtrusive, shown wherever a
 * result is presented.
 */
export function DisclaimerNotice({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={`${styles.notice} ${styles.disclaimer}`} role="note">
      <InfoIcon className={styles.icon} />
      <span className={styles.text}>{children}</span>
    </div>
  );
}

/** Stage-1 demo-data explanation. */
export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <div className={`${styles.notice} ${styles.demo}`} role="note">
      <FlaskIcon className={styles.icon} />
      <span className={styles.text}>{children}</span>
    </div>
  );
}

function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 3h6" />
      <path d="M10 3v6.2L4.9 18a2.1 2.1 0 0 0 1.8 3.2h10.6A2.1 2.1 0 0 0 19.1 18L14 9.2V3" />
      <path d="M7.2 14.5h9.6" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16.5" />
      <circle cx="12" cy="7.6" r="0.6" fill="currentColor" />
    </svg>
  );
}

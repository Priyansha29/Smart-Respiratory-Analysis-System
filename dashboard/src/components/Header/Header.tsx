import { Badge } from "../ui/Badge";
import styles from "./Header.module.css";

interface HeaderProps {
  /** Stage-1 mock mode indicator. */
  demoMode: boolean;
}

/**
 * Global header: identity, tagline, system status and the
 * research-prototype badge.
 */
export function Header({ demoMode }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Logo className={styles.mark} />
          <div className={styles.brandText}>
            <div className={styles.name}>
              <span>
                Pulmo<span className={styles.nameAccent}>Sense</span>
              </span>
            </div>
            <div className={styles.tagline}>
              An Intelligent Respiratory Sound &amp; Lung Analysis Platform
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <Badge variant="primary" title="Engineering project build">
            Research Prototype
          </Badge>
          <span
            className={styles.status}
            title={
              demoMode
                ? "The dashboard is running on Stage-1 mock analysis data."
                : "Connected to the analysis backend."
            }
          >
            <span
              className={`${styles.statusDot} ${demoMode ? styles.statusDotDemo : ""}`}
              aria-hidden
            />
            {demoMode ? "Demo mode · Engine standby" : "System ready"}
          </span>
        </div>
      </div>
    </header>
  );
}

/** PulmoSense mark: breath waveform inside a rounded shield. */
function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      role="img"
    >
      <defs>
        <linearGradient id="ps-mark" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#2C5EAD" />
          <stop offset="100%" stopColor="#1591DC" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#ps-mark)" />
      <path
        d="M7 21.5h4.6l2.1-6.4 3 12.2 3.1-16 2.8 10.2 1.9-4.4h5.5"
        stroke="#FFFFFF"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.95"
      />
      <circle cx="31.5" cy="21.5" r="2.1" fill="#C4E2F5" />
    </svg>
  );
}

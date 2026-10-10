import { Badge } from "../ui/Badge";
import styles from "./Header.module.css";

/** Connectivity state of the analysis engine, shown in the header pill. */
export type SystemStatus =
  | { mode: "demo" }
  | { mode: "unconfigured" }
  | {
      mode: "real";
      state: "checking" | "starting" | "ready" | "offline";
      detail?: string;
    };

interface HeaderProps {
  status: SystemStatus;
}

/**
 * Global header: identity, tagline, live engine status and the
 * research-prototype badge.
 */
export function Header({ status }: HeaderProps) {
  const view = describe(status);
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
          <span className={styles.status} title={view.title}>
            <span className={`${styles.statusDot} ${view.dotClass}`} aria-hidden />
            {view.label}
          </span>
        </div>
      </div>
    </header>
  );
}

function describe(status: SystemStatus): {
  label: string;
  title: string;
  dotClass: string;
} {
  if (status.mode === "demo") {
    return {
      label: "Demo mode · Simulated data",
      title:
        "Demo mode is enabled (VITE_DEMO_MODE=true). Results are simulated and clearly labelled — never a real model inference.",
      dotClass: styles.statusDotDemo,
    };
  }
  if (status.mode === "unconfigured") {
    return {
      label: "Backend not configured",
      title:
        "No analysis backend is configured. Set VITE_API_BASE (e.g. http://127.0.0.1:8000) to the FastAPI server, or enable demo mode with VITE_DEMO_MODE=true.",
      dotClass: styles.statusDotWarn,
    };
  }
  switch (status.state) {
    case "ready":
      return {
        label: "System ready",
        title: "Connected to the MATLAB analysis engine.",
        dotClass: "",
      };
    case "starting":
      return {
        label: "Engine starting…",
        title:
          "The MATLAB analysis worker is loading the trained models. This can take up to a minute.",
        dotClass: styles.statusDotBusy,
      };
    case "offline":
      return {
        label: "Backend offline",
        title:
          status.detail ??
          "The dashboard cannot reach the analysis backend. Is the FastAPI server running?",
        dotClass: styles.statusDotWarn,
      };
    case "checking":
    default:
      return {
        label: "Connecting…",
        title: "Contacting the analysis backend.",
        dotClass: styles.statusDotBusy,
      };
  }
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

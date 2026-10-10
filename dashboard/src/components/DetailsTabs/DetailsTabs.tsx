import { useState } from "react";
import type { AnalysisResult } from "../../types/analysis";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { SignalTab } from "./tabs/SignalTab";
import { PreprocessingTab } from "./tabs/PreprocessingTab";
import { SegmentationTab } from "./tabs/SegmentationTab";
import { FeaturesTab } from "./tabs/FeaturesTab";
import { PCATab } from "./tabs/PCATab";
import { MLTab } from "./tabs/MLTab";
import { ExplainabilityTab } from "./tabs/ExplainabilityTab";
import { ReliabilityTab } from "./tabs/ReliabilityTab";
import styles from "./DetailsTabs.module.css";

type TabKey =
  | "signal"
  | "preprocessing"
  | "segmentation"
  | "features"
  | "pca"
  | "ml"
  | "explainability"
  | "reliability";

const TABS: { key: TabKey; label: string }[] = [
  { key: "signal", label: "Signal" },
  { key: "preprocessing", label: "Preprocessing" },
  { key: "segmentation", label: "Segmentation" },
  { key: "features", label: "Features" },
  { key: "pca", label: "PCA / Feature Space" },
  { key: "ml", label: "Machine Learning" },
  { key: "explainability", label: "Explainability" },
  { key: "reliability", label: "Reliability" },
];

interface DetailsTabsProps {
  result: AnalysisResult;
}

/**
 * Two-level UX: the collapsed state invites technical users into
 * the research workspace; the expanded state exposes the eight
 * analysis views of the DSP + ML pipeline.
 */
export function DetailsTabs({ result }: DetailsTabsProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<TabKey>("signal");

  if (!open) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.cta}>
          <div className={styles.ctaText}>
            <div className={styles.ctaTitle}>
              Technical analysis workspace
            </div>
            <p className={styles.ctaHint}>
              Inspect preprocessing, respiratory-cycle segmentation, the 101
              engineered features, PCA projection, model comparison,
              explainability and reliability of this analysis.
            </p>
          </div>
          <button
            type="button"
            className={styles.ctaButton}
            onClick={() => setOpen(true)}
            aria-expanded={false}
          >
            <GridIcon />
            View more details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.workspace}>
        <div className={styles.workspaceHead}>
          <div className="eyebrow">Technical analysis workspace</div>
          <button
            type="button"
            className={styles.closeDetails}
            onClick={() => setOpen(false)}
            aria-expanded
          >
            <CollapseIcon />
            Hide details
          </button>
        </div>

        <nav className={styles.tabBar} role="tablist" aria-label="Analysis views">
          {TABS.map((tab, i) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active === tab.key}
              type="button"
              className={`${styles.tab} ${active === tab.key ? styles.tabActive : ""}`}
              onClick={() => setActive(tab.key)}
            >
              <span className={styles.tabIndex}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={styles.tabPanel} role="tabpanel">
          <ErrorBoundary
            resetKey={active}
            label={TABS.find((tab) => tab.key === active)?.label}
          >
            {active === "signal" && <SignalTab result={result} />}
            {active === "preprocessing" && <PreprocessingTab result={result} />}
            {active === "segmentation" && <SegmentationTab result={result} />}
            {active === "features" && <FeaturesTab result={result} />}
            {active === "pca" && <PCATab result={result} />}
            {active === "ml" && <MLTab result={result} />}
            {active === "explainability" && (
              <ExplainabilityTab result={result} />
            )}
            {active === "reliability" && <ReliabilityTab result={result} />}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

function GridIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 15l6-6 6 6" />
    </svg>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisResult, AudioMetadata } from "../../types/analysis";
import {
  analyzeAudio,
  getHealth,
  HAS_BACKEND,
  IS_DEMO_MODE,
  IS_UNCONFIGURED,
  type AnalyzeProgress,
  type BackendHealth,
} from "../../services/api";
import { readAudioMetadata } from "../../utils/wav";
import { Header, type SystemStatus } from "../../components/Header/Header";
import { AudioInputPanel } from "../../components/AudioInput/AudioInputPanel";
import { AnalysisResultPanel } from "../../components/AnalysisResult/AnalysisResult";
import { SignalQualityCard } from "../../components/SignalQuality/SignalQualityCard";
import { WaveformChart } from "../../components/WaveformChart/WaveformChart";
import { DetailsTabs } from "../../components/DetailsTabs/DetailsTabs";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { DisclaimerNotice, DemoNotice } from "../../components/ui/Notice";
import styles from "./Dashboard.module.css";

/**
 * Main dashboard: Level-1 (what was detected / what it means) with
 * the Level-2 technical workspace below.
 */
export function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SystemStatus>(initialStatus);
  const resultRef = useRef<HTMLDivElement | null>(null);

  // Revoke object URLs when the selection changes or on unmount.
  useEffect(() => {
    return () => {
      if (metadata?.playbackUrl) URL.revokeObjectURL(metadata.playbackUrl);
    };
  }, [metadata?.playbackUrl]);

  // Poll backend health so the header reflects the real engine state.
  useEffect(() => {
    if (!HAS_BACKEND) return;
    let cancelled = false;
    const poll = async () => {
      const health = await getHealth();
      if (!cancelled) setStatus(mapHealth(health));
    };
    void poll();
    const id = window.setInterval(poll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const handleFileSelected = useCallback(async (selected: File) => {
    setError(null);
    setResult(null);
    setFile(selected);
    try {
      const meta = await readAudioMetadata(selected);
      setMetadata(meta);
    } catch {
      setError("The selected file could not be read as an audio recording.");
      setFile(null);
      setMetadata(null);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!file || analyzing) return;
    setError(null);
    setResult(null);
    setProgress({ phase: "uploading", percent: 0 });
    setAnalyzing(true);
    try {
      const analysis = await analyzeAudio(file, setProgress);
      setResult(analysis);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Analysis failed unexpectedly. Please try again."
      );
    } finally {
      setAnalyzing(false);
      setProgress(null);
    }
  }, [file, analyzing]);

  const handleClear = useCallback(() => {
    setFile(null);
    setMetadata(null);
    setResult(null);
    setError(null);
  }, []);

  return (
    <>
      <Header status={status} />

      <main className={styles.page}>
        {status.mode === "demo" && (
          <DemoNotice>
            <strong>Demo mode.</strong> Results on this page are simulated for
            demonstration and are clearly marked. They are not produced by the
            trained model. Unset <code>VITE_DEMO_MODE</code> and configure{" "}
            <code>VITE_API_BASE</code> to run real inference.
          </DemoNotice>
        )}
        {/* ---------------- Input + result ---------------- */}
        <div className={styles.topGrid}>
          <div className={styles.leftColumn}>
            <Card eyebrow="Audio input" title="Respiratory recording">
              <AudioInputPanel
                metadata={metadata}
                isAnalyzing={analyzing}
                progress={progress}
                error={error}
                isConfigured={!IS_UNCONFIGURED}
                onFileSelected={handleFileSelected}
                onAnalyze={handleAnalyze}
                onClear={handleClear}
              />
            </Card>

            <Card
              eyebrow="Signal quality"
              action={
                result ? (
                  <Badge variant="neutral" title="Computed from the uploaded signal">
                    Live metrics
                  </Badge>
                ) : undefined
              }
            >
              {result ? (
                <SignalQualityCard quality={result.signalQuality} />
              ) : (
                <p className={styles.emptyHint} style={{ textAlign: "left" }}>
                  Signal quality metrics (SNR, RMSE, correlation, RMS) appear
                  here after a recording has been analyzed.
                </p>
              )}
            </Card>
          </div>

          <div className={styles.resultColumn} ref={resultRef}>
            <Card
              eyebrow="Analysis result"
              title="Detected respiratory sound pattern"
              action={
                result?.meta.isDemo ? (
                  <span className={styles.demoChip}>
                    <span aria-hidden>◆</span> Demo data
                  </span>
                ) : undefined
              }
            >
              {analyzing ? (
                <div className={styles.skeleton} style={{ border: "none", padding: 0, boxShadow: "none" }}>
                  <div className={styles.skeletonLabel}>
                    <span className={styles.spinner} />
                    {progress?.phase === "uploading"
                      ? `Uploading recording… ${progress.percent}%`
                      : progress?.phase === "analyzing"
                        ? "Analyzing on the MATLAB engine · preprocessing · feature extraction · classification…"
                        : "Running DSP preprocessing · feature extraction · classification…"}
                  </div>
                  <div className={`${styles.skeletonRow} ${styles.skeletonTitle}`} />
                  <div className={styles.skeletonRow} />
                  <div className={styles.skeletonRow} style={{ width: "72%" }} />
                  <div className={styles.skeletonBlock} />
                </div>
              ) : result ? (
                <AnalysisResultPanel result={result} />
              ) : (
                <div className={styles.empty}>
                  <LungsIcon className={styles.emptyIcon} />
                  <div className={styles.emptyTitle}>No analysis yet</div>
                  <p className={styles.emptyHint}>
                    Select a WAV respiratory recording on the left and press{" "}
                    <strong>Analyze recording</strong> to see the detected
                    acoustic pattern, confidence and signal quality.
                  </p>
                </div>
              )}
            </Card>

            <DisclaimerNotice>
              Research/educational analysis only — this system is intended for
              research and educational purposes and is not a clinical
              diagnostic tool. It classifies respiratory acoustic patterns and
              does not diagnose diseases.
            </DisclaimerNotice>
          </div>
        </div>

        {/* ---------------- Waveform ---------------- */}
        <Card
          eyebrow="Signal visualization"
          title="Respiratory sound waveform"
          subtitle="Amplitude vs time for the analyzed recording"
          action={
            <div className={styles.sectionHead}>
              {result && (
                <Badge variant="cyan">
                  {result.signalQuality.duration.toFixed(2)} s ·{" "}
                  {result.signalQuality.samplingRate.toLocaleString("en-US")} Hz
                </Badge>
              )}
            </div>
          }
        >
          {result ? (
            <WaveformChart
              waveform={result.waveform}
              caption={`Full recording waveform · analyzed at ${new Date(
                result.meta.analyzedAt
              ).toLocaleString()}`}
            />
          ) : (
            <div className={styles.empty}>
              <WaveIcon className={styles.emptyIcon} />
              <div className={styles.emptyTitle}>Waveform pending</div>
              <p className={styles.emptyHint}>
                The amplitude-vs-time visualization of the recording appears
                here once analysis is complete.
              </p>
            </div>
          )}
        </Card>

        {/* ---------------- More details ---------------- */}
        {result ? (
          <DetailsTabs
            key={result.meta.analyzedAt}
            result={result}
          />
        ) : (
          <div className={styles.empty} style={{ minHeight: 120 }}>
            <p className={styles.emptyHint}>
              The technical analysis workspace (signal, preprocessing,
              segmentation, features, PCA, machine learning, explainability,
              reliability) opens after analysis.
            </p>
          </div>
        )}

        {/* ---------------- Footer ---------------- */}
        <footer className={styles.footer}>
          <DisclaimerNotice>
            This system is intended for research and educational purposes and
            is not a clinical diagnostic tool. It identifies respiratory
            acoustic patterns (normal, crackle, wheeze, crackle + wheeze) and
            must not be used to diagnose conditions such as asthma, COPD or
            pneumonia.
          </DisclaimerNotice>
          <div className={styles.footerRow}>
            <span className={styles.footerBrand}>
              PulmoSense · An Intelligent Respiratory Sound &amp; Lung Analysis
              Platform
            </span>
            <span>
              Research prototype · DSP + feature engineering + machine-learning
              pipeline
            </span>
          </div>
        </footer>
      </main>
    </>
  );
}

function LungsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v9" />
      <path d="M12 8c-1.3-1.6-3-2.3-4.6-1.7C5.2 7 4 9.4 3.6 12.6c-.3 2.4-.4 4.7-.2 6.3.1 1.2 1 2 2.2 2 1.7 0 3-1.4 3.4-3.6.4-2.3.8-4.5 1.5-6.2" />
      <path d="M12 8c1.3-1.6 3-2.3 4.6-1.7 2.2.7 3.4 3.1 3.8 6.3.3 2.4.4 4.7.2 6.3-.1 1.2-1 2-2.2 2-1.7 0-3-1.4-3.4-3.6-.4-2.3-.8-4.5-1.5-6.2" />
    </svg>
  );
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12h3l2-7 3 14 2.5-11 2 8 1.8-4H22" />
    </svg>
  );
}

/* ------------------------------------------------------------
   Backend status helpers
   ------------------------------------------------------------ */

function initialStatus(): SystemStatus {
  if (IS_DEMO_MODE) return { mode: "demo" };
  if (!HAS_BACKEND) return { mode: "unconfigured" };
  return { mode: "real", state: "checking" };
}

function mapHealth(health: BackendHealth | null): SystemStatus {
  if (!health) return { mode: "real", state: "offline" };
  if (health.inference_ready) return { mode: "real", state: "ready" };
  if (health.matlab_worker === "starting") {
    return { mode: "real", state: "starting" };
  }
  return {
    mode: "real",
    state: "offline",
    detail: health.worker_detail ?? undefined,
  };
}

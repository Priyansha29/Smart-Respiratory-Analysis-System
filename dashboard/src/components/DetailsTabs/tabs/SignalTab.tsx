import type { AnalysisResult } from "../../../types/analysis";
import { WaveformChart } from "../../WaveformChart/WaveformChart";
import { featureValue } from "../../../utils/features";
import { count, fixed } from "../../../utils/format";
import shared from "./shared.module.css";

/**
 * SIGNAL — the acquired respiratory audio before advanced
 * processing, with basic amplitude statistics.
 */
export function SignalTab({ result }: { result: AnalysisResult }) {
  const q = result.signalQuality;
  const v = (name: string) => featureValue(result, name);

  return (
    <div className={shared.stack}>
      <div className={shared.explain}>
        <span className={shared.explainTitle}>About this view</span>
        This view shows the acquired respiratory audio signal before advanced
        processing. The waveform is plotted as amplitude against time; the
        statistics below summarise its distribution and dynamic range.
      </div>

      <WaveformChart
        waveform={result.waveform}
        height={260}
        caption={`Raw recording · ${fixed(q.duration, 2)} s at ${q.samplingRate.toLocaleString("en-US")} Hz · ${count(q.sampleCount)} samples`}
      />

      <div className={shared.kpis}>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Duration</span>
          <span className={shared.kpiValue}>{fixed(q.duration, 2)} s</span>
          <span className={shared.kpiHint}>Recording length</span>
        </div>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Sampling frequency</span>
          <span className={shared.kpiValue}>
            {q.samplingRate.toLocaleString("en-US")} Hz
          </span>
          <span className={shared.kpiHint}>Acquisition rate</span>
        </div>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Sample count</span>
          <span className={shared.kpiValue}>{count(q.sampleCount)}</span>
          <span className={shared.kpiHint}>Discrete samples</span>
        </div>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>RMS amplitude</span>
          <span className={shared.kpiValue}>{fixed(v("RMS") ?? q.rms, 4)}</span>
          <span className={shared.kpiHint}>Root mean square</span>
        </div>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Peak amplitude</span>
          <span className={shared.kpiValue}>
            {fixed(v("Peak") ?? q.peakAmplitude, 4)}
          </span>
          <span className={shared.kpiHint}>Maximum |x(t)|</span>
        </div>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Mean</span>
          <span className={shared.kpiValue}>{fixed(v("Mean") ?? 0, 5)}</span>
          <span className={shared.kpiHint}>DC component removed</span>
        </div>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Std deviation</span>
          <span className={shared.kpiValue}>{fixed(v("Std") ?? 0, 4)}</span>
          <span className={shared.kpiHint}>Amplitude spread</span>
        </div>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Crest factor</span>
          <span className={shared.kpiValue}>{fixed(v("CrestFactor") ?? 0, 2)}</span>
          <span className={shared.kpiHint}>Peak / RMS</span>
        </div>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Zero-crossing rate</span>
          <span className={shared.kpiValue}>
            {fixed(v("ZeroCrossingRate") ?? 0, 4)}
          </span>
          <span className={shared.kpiHint}>Sign changes per sample</span>
        </div>
        <div className={shared.kpi}>
          <span className={shared.kpiLabel}>Dynamic range</span>
          <span className={shared.kpiValue}>
            {fixed(v("DynamicRange") ?? 0, 4)}
          </span>
          <span className={shared.kpiHint}>max − min</span>
        </div>
      </div>

      <div className={shared.grid2}>
        <div className={shared.explain}>
          <span className={shared.explainTitle}>Signal statistics</span>
          Higher-order statistics (skewness, kurtosis, entropy) computed on this
          signal form part of the time-domain feature group used by the
          classifier.
        </div>
        <div className={shared.explain}>
          <span className={shared.explainTitle}>Provenance</span>
          Waveform and amplitude statistics are read directly from the uploaded
          recording. Full feature values in the Features tab are demo data until
          the MATLAB engine is connected.
        </div>
      </div>
    </div>
  );
}

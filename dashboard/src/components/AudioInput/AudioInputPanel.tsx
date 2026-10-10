import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { AudioMetadata } from "../../types/analysis";
import { timecode } from "../../utils/format";
import styles from "./AudioInputPanel.module.css";

interface AudioInputPanelProps {
  metadata: AudioMetadata | null;
  isAnalyzing: boolean;
  error: string | null;
  onFileSelected: (file: File) => void;
  onAnalyze: () => void;
  onClear: () => void;
}

const WAV_EXTENSIONS = [".wav", ".wave"];

function isWavFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return (
    WAV_EXTENSIONS.some((ext) => lower.endsWith(ext)) ||
    file.type === "audio/wav" ||
    file.type === "audio/x-wav" ||
    file.type === "audio/wave"
  );
}

/**
 * Audio input control panel: drag-and-drop / browse selection,
 * recording metadata, playback transport and the analyze action.
 */
export function AudioInputPanel({
  metadata,
  isAnalyzing,
  error,
  onFileSelected,
  onAnalyze,
  onClear,
}: AudioInputPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  // Reset transport whenever the selection changes.
  useEffect(() => {
    setPlaying(false);
    setPosition(0);
  }, [metadata?.playbackUrl]);

  const accept = (file: File | undefined | null) => {
    if (!file) return;
    if (!isWavFile(file)) {
      setLocalError(
        `"${file.name}" is not a WAV recording. Please select a .wav respiratory sound file.`
      );
      return;
    }
    setLocalError(null);
    onFileSelected(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (isAnalyzing) return;
    accept(event.dataTransfer.files?.[0]);
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const seek = (event: ReactMouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !metadata) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = fraction * metadata.duration;
    setPosition(audio.currentTime);
  };

  const displayError = localError ?? error;

  return (
    <div className={styles.panel}>
      {!metadata ? (
        <>
          <div
            className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
          >
            <UploadIcon className={styles.dropIcon} />
            <div className={styles.dropTitle}>
              Drop a respiratory sound recording here
            </div>
            <div className={styles.dropHint}>
              Mono WAV recordings of breath sounds (ICBHI-style). Speech or
              ambient room audio is not appropriate input for this system.
            </div>
            <div className={styles.dropFormats}>
              <span className={styles.formatChip}>WAV</span>
              <span className={styles.formatChip}>PCM</span>
            </div>
            <button type="button" className={styles.browseBtn}>
              Browse WAV file
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.fileCard}>
            <div className={styles.fileIcon}>
              <WaveFileIcon />
            </div>
            <div className={styles.fileMeta}>
              <div className={styles.fileName} title={metadata.fileName}>
                {metadata.fileName}
              </div>
              <div className={styles.fileSub}>
                Recording ready for analysis
              </div>
            </div>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={onClear}
              disabled={isAnalyzing}
              title="Remove recording"
              aria-label="Remove recording"
            >
              <CloseIcon />
            </button>
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaCell}>
              <span className={styles.metaLabel}>Duration</span>
              <span className={styles.metaValue}>
                {metadata.duration.toFixed(2)} s
              </span>
            </div>
            <div className={styles.metaCell}>
              <span className={styles.metaLabel}>Sampling rate</span>
              <span className={styles.metaValue}>
                {metadata.samplingRate.toLocaleString("en-US")} Hz
              </span>
            </div>
            <div className={styles.metaCell}>
              <span className={styles.metaLabel}>Channels</span>
              <span className={styles.metaValue}>{metadata.channels}</span>
            </div>
          </div>

          <div className={styles.player}>
            <button
              type="button"
              className={styles.playBtn}
              onClick={togglePlayback}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div className={styles.track} onClick={seek}>
              <div className={styles.trackRail}>
                <div
                  className={styles.trackFill}
                  style={{
                    width: `${
                      metadata.duration > 0
                        ? (position / metadata.duration) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <span className={styles.time}>
              {timecode(position)} / {timecode(metadata.duration)}
            </span>
            <audio
              ref={audioRef}
              src={metadata.playbackUrl}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
            />
          </div>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".wav,.wave,audio/wav,audio/x-wav"
        className={styles.hiddenInput}
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {displayError && (
        <div className={styles.error} role="alert">
          <span aria-hidden>⚠</span>
          <span>{displayError}</span>
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.analyzeBtn}
          onClick={onAnalyze}
          disabled={!metadata || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <span className={styles.spinner} aria-hidden />
              Analyzing recording…
            </>
          ) : (
            <>
              <PulseIcon />
              Analyze recording
            </>
          )}
        </button>
        <button
          type="button"
          className={styles.clearBtn}
          onClick={onClear}
          disabled={!metadata || isAnalyzing}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   Icons
   ------------------------------------------------------------ */

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 16V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15" />
    </svg>
  );
}

function WaveFileIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M3 12h2.5l1.6-4.5L9.4 17l2-11 2 14 1.8-7 1.4 3H21" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6.5" y="5.5" width="4" height="13" rx="1" />
      <rect x="13.5" y="5.5" width="4" height="13" rx="1" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12h4l2-6 3.5 12L14 7l1.8 5H22" />
    </svg>
  );
}

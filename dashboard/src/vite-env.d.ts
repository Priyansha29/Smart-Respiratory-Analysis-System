/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the FastAPI backend, e.g. http://127.0.0.1:8000.
   * When set, the dashboard calls POST /analyze on the real backend.
   */
  readonly VITE_API_BASE?: string;
  /**
   * Set to "true" to run the explicitly-selected demo mode (simulated
   * analysis, always clearly labelled). Ignored when VITE_API_BASE is set.
   */
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

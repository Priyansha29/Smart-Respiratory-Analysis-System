/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the FastAPI backend.
   * When unset (Stage 1), the dashboard runs on the mock analysis
   * service. Set VITE_API_BASE, e.g. http://127.0.0.1:8000, to
   * switch the same call to POST /analyze on the real backend.
   */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

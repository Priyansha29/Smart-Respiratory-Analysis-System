import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// PulmoSense dashboard dev/build configuration.
// The frontend is intentionally decoupled from the MATLAB engine: during Stage 1
// it talks to a mock service (src/services/api.ts) that will later be swapped
// for a real FastAPI POST /analyze call.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

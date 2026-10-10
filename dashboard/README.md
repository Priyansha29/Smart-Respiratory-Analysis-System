# Smart Respiratory Lung Analysis System Dashboard (Frontend)

A light, clinical-style web frontend for the respiratory-sound analysis
pipeline. With a backend configured it runs **real MATLAB inference**:
upload a WAV and the FastAPI service returns results from the trained
Part 4 models. A clearly-labelled **demo mode** remains available as an
explicit opt-in. The MATLAB research code is never modified by the
frontend.

## Run it

```bash
cd dashboard
npm install
npm run dev
```

Open http://127.0.0.1:5173, upload a WAV (or use the bundled sample at
`samples/demo_respiratory_recording.wav`), press **Analyze recording**,
then open **View more details** for the eight technical tabs.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run generate-sample` | Regenerate the synthetic demo WAV |
| `npm run check-pipeline` | End-to-end contract checks (types, DSP, segmentation, features, ML sections) |

## Connecting to the backend (Stage 2 — real MATLAB inference)

All data flows through a single seam — `src/services/api.ts`:

- With `VITE_API_BASE` set (e.g. `.env.local` →
  `VITE_API_BASE=http://127.0.0.1:8000`), `analyzeAudio(file)` performs
  `POST {VITE_API_BASE}/analyze` (multipart, field `audio`) and the header
  polls `GET {VITE_API_BASE}/health`.
- Without a backend, demo mode is **opt-in**: set `VITE_DEMO_MODE=true` to run
  the clearly-labelled simulated analysis. If neither is set the dashboard is
  *unconfigured* and will not silently mock results.
- The response shape is defined once in `src/types/analysis.ts`
  (`AnalysisResult`), which the FastAPI/MATLAB side matches exactly.

Start the backend first (see [`../backend/README.md`](../backend/README.md)):

```bash
cd backend
py -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The MATLAB worker takes up to ~1 minute to load the models; the header shows
*Engine starting…* until `/health` reports ready.

## Conventions

- Design tokens live in `src/styles/tokens.css` (primary `#2C5EAD`,
  secondary `#1591DC`, alert `#DF301C`, orange `#FF9100`); orange/red
  are reserved for warnings.
- Component styling uses plain CSS Modules.
- Medical-language rules: findings are presented as a *Detected
  Respiratory Sound Pattern* with plain-language interpretation;
  confidence is always labelled *model-derived*, never a calibrated
  probability; the research-only disclaimer is always visible.

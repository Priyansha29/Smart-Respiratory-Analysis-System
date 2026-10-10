# PulmoSense Dashboard (Stage 1 — Frontend)

A light, clinical-style web frontend for the respiratory-sound analysis
pipeline. **Stage 1 only**: the UI runs against a local mock analysis
service that computes real DSP previews (filtering, denoising,
spectrogram, MFCC, segmentation, signal-quality metrics) in the browser
and returns clearly-labelled **demo** model outputs. No MATLAB code is
executed or modified by this stage.

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

## Moving to Stage 3 (MATLAB connection)

All data flows through a single seam — `src/services/api.ts`:

- `analyzeAudio(file)` currently returns `buildMockAnalysis(...)` and
  `IS_MOCK_MODE` is `true`.
- Set `VITE_API_BASE` (e.g. `.env.local` → `VITE_API_BASE=http://127.0.0.1:8000`)
  and the same function switches to `POST {VITE_API_BASE}/analyze`
  returning `FormData` — no component changes required.
- The response shape is defined once in `src/types/analysis.ts`
  (`AnalysisResult`), which the FastAPI/MATLAB side must match.

## Conventions

- Design tokens live in `src/styles/tokens.css` (primary `#2C5EAD`,
  secondary `#1591DC`, alert `#DF301C`, orange `#FF9100`); orange/red
  are reserved for warnings.
- Component styling uses plain CSS Modules.
- Medical-language rules: findings are presented as a *Detected
  Respiratory Sound Pattern* with plain-language interpretation;
  confidence is always labelled *model-derived*, never a calibrated
  probability; the research-only disclaimer is always visible.

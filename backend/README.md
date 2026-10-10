# PulmoSense backend (FastAPI + MATLAB)

A thin FastAPI service that runs the **real** trained MATLAB models on an
uploaded respiratory recording and returns the dashboard's `AnalysisResult`
JSON.

- `GET /health` — liveness + MATLAB/model/inference diagnostics (no local
  paths leaked).
- `POST /analyze` — multipart upload (field `audio`, `.wav`) → real inference.

There is **no mock fallback**: if MATLAB or the model is unavailable the API
returns a clear error (`503`/`422`), never fabricated data.

## How it runs (why not MATLAB Engine)

MATLAB Engine for Python is unusable here: R2024a supports only Python
3.9–3.11 and this machine has Python 3.13 (`OSError: MATLAB Engine for Python
supports Python version 3.9, 3.10, and 3.11, but your version of Python is
3.13`).

Instead the backend launches **one persistent MATLAB worker** once:

```
matlab -batch "addpath('<root>/inference'); inferenceWorker('<jobDir>')"
```

The worker loads the 56 MB `Part4_TrainedModels.mat` a single time and then
serves jobs through a small file-based JSON queue in `jobDir`
(`<id>.req.json` → `<id>.res.json`). This keeps the ~1 min startup + model
load out of the request path.

## Requirements

- Python 3.11+ (3.13 works; the engine is not used).
- MATLAB R2024a with the Wavelet + Signal Processing toolboxes (used by the
  unchanged research feature extractors).
- The trained artifact `Part4_TrainedModels.mat` at the project root (or set
  `PULMOSENSE_MODEL_FILE`).

## Install & run

```bash
cd backend
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

MATLAB takes up to ~1 minute to become ready — `/health` reports
`matlab_worker: "starting"` until then, and `/analyze` returns `503` during
that window.

## Configuration (environment variables)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PULMOSENSE_PROJECT_ROOT` | parent of `backend/` | Project root (MATLAB scripts + artifact) |
| `PULMOSENSE_MATLAB_EXE` | auto-detected | Path to `matlab.exe` |
| `PULMOSENSE_MODEL_FILE` | `<root>/Part4_TrainedModels.mat` | Trained model artifact |
| `PULMOSENSE_JOB_DIR` | `%TEMP%/pulmosense_jobs` | Worker request/response queue |
| `PULMOSENSE_MAX_UPLOAD_MB` | `50` | Upload size limit |
| `PULMOSENSE_STARTUP_TIMEOUT_S` | `300` | Worker startup timeout |
| `PULMOSENSE_INFERENCE_TIMEOUT_S` | `180` | Per-request inference timeout |
| `PULMOSENSE_WORKER_ENABLED` | `1` | Set `0` to run the API without MATLAB |
| `PULMOSENSE_ALLOWED_ORIGINS` | `http://127.0.0.1:5173,http://localhost:5173` | CORS origins |

## Tests

Fast unit tests (no MATLAB, worker disabled automatically):

```bash
py -m pytest backend/tests -q
```

Genuine end-to-end tests (start the real MATLAB worker):

```powershell
$env:PULMOSENSE_RUN_MATLAB_TESTS="1"
py -m pytest backend/tests/test_integration_matlab.py -s
```

## Limitations (honest notes)

- The trained models are weak on the held-out ICBHI split (Ensemble accuracy
  ≈ 0.38, SVM ≈ 0.46). Reported metrics are the real dataset-level values.
- ICBHI training used each file's **native** sampling rate (mixed 4 kHz /
  10 kHz / 44.1 kHz), so uploads are analysed at their native rate too.
- Uploaded recordings have no ICBHI annotation file, so cycles are found with
  a separate annotation-free energy-envelope segmenter — an approximation of
  the clinically annotated cycles used in training.
- This is a research/educational tool, not a clinical diagnostic device.

### Segmentation agreement (measured, not claimed)

`inference/segmentRespiratorySignal.m` is a heuristic, **not** validated
segmentation. Comparing its output with the real ICBHI `.txt` annotations on a
spread of 8 recordings through the production path (20 ms raster):

| metric | mean |
| --- | --- |
| annotated-cycle coverage | 0.95 |
| detected-segment coverage | 0.33 |
| timeline Jaccard | 0.33 |

Agreement is near-perfect on continuously-active recordings (e.g.
`101_1b1_Al_sc_Meditron`: Jaccard 0.997, coverage 1.00) and lower where the
recording has pronounced breath pauses, because the heuristic detects energy
excursions and cannot recover clinical inspiration/expiration boundaries.


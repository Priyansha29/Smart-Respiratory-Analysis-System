"""PulmoSense FastAPI backend.

Endpoints
---------
GET  /health   -> liveness + MATLAB/model/inference diagnostics
POST /analyze  -> multipart WAV upload (field ``audio``) -> real MATLAB result

The result JSON matches the dashboard's ``AnalysisResult`` TypeScript contract
(see dashboard/src/types/analysis.ts). Predictions always come from the real
MATLAB inference path; there is no mock fallback.
"""
from __future__ import annotations

import os
import tempfile
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import Settings
from .matlab_bridge import InferenceError, MatlabBridge, MatlabUnavailable

settings = Settings()
bridge = MatlabBridge(settings)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the (slow) MATLAB worker in the background; the API serves
    # /health immediately and /analyze returns 503 until it is ready.
    bridge.start()
    try:
        yield
    finally:
        bridge.stop()


app = FastAPI(
    title="PulmoSense API",
    description="MATLAB-backed respiratory sound analysis (research/education).",
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------- health
@app.get("/health")
def health() -> dict:
    h = bridge.health()
    model_ok = h["model_available"]
    inference_ready = h["worker_state"] == "ready" and model_ok
    return {
        "status": "ok",
        "api": "running",
        "demo_mode": False,
        # integration diagnostics (no sensitive absolute paths exposed)
        "matlab_available": h["matlab_available"],
        "matlab_worker": h["worker_state"],
        "matlab_version": h["matlab_version"],
        "worker_detail": h["worker_detail"],
        "model_artifact": settings.model_file.name if model_ok else None,
        "model_artifact_accessible": model_ok,
        "inference_ready": inference_ready,
    }


# -------------------------------------------------------------------- analyze
def _validate_wav_header(data: bytes) -> None:
    if len(data) < 12 or data[0:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise HTTPException(
            status_code=422,
            detail="File is not a valid WAV recording (missing RIFF/WAVE header).",
        )


@app.post("/analyze")
async def analyze(audio: UploadFile = File(...)):
    filename = audio.filename or "upload.wav"
    if not filename.lower().endswith(".wav"):
        raise HTTPException(
            status_code=415, detail="Only uncompressed .wav recordings are supported."
        )

    limit = settings.max_upload_bytes
    data = bytearray()
    while True:
        chunk = await audio.read(1024 * 1024)
        if not chunk:
            break
        data.extend(chunk)
        if len(data) > limit:
            raise HTTPException(
                status_code=413,
                detail=f"Upload exceeds the {settings.max_upload_mb:.0f} MB limit.",
            )

    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    _validate_wav_header(bytes(data[:12]))

    tmp_dir = Path(tempfile.gettempdir()) / "pulmosense_uploads"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    tmp_path = tmp_dir / f"{uuid.uuid4().hex}.wav"
    tmp_path.write_bytes(bytes(data))

    try:
        result = await run_in_threadpool(
            bridge.analyze, tmp_path, {"displayName": filename}
        )
    except MatlabUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except InferenceError as exc:
        raise HTTPException(
            status_code=422, detail=f"The recording could not be analysed: {exc}"
        )
    finally:
        try:
            tmp_path.unlink()
        except OSError:
            pass

    return JSONResponse(content=result)

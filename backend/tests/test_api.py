"""API contract & validation tests (no MATLAB required)."""
from __future__ import annotations

import io

from fastapi.testclient import TestClient

from app.main import app, bridge
from app.matlab_bridge import InferenceError

client = TestClient(app)


def test_health_schema():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    for key in (
        "status",
        "api",
        "demo_mode",
        "matlab_available",
        "matlab_worker",
        "model_artifact_accessible",
        "inference_ready",
    ):
        assert key in body, key
    assert body["api"] == "running"
    assert body["demo_mode"] is False
    # no absolute local paths leaked
    assert not any(
        isinstance(v, str) and ("\\" in v or ":/" in v) for v in body.values()
    )


def test_analyze_rejects_non_wav():
    r = client.post(
        "/analyze",
        files={"audio": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert r.status_code == 415


def test_analyze_rejects_empty():
    r = client.post(
        "/analyze", files={"audio": ("empty.wav", io.BytesIO(b""), "audio/wav")}
    )
    assert r.status_code == 400


def test_analyze_rejects_bad_header():
    r = client.post(
        "/analyze",
        files={"audio": ("bad.wav", io.BytesIO(b"not a real wav file"), "audio/wav")},
    )
    assert r.status_code == 422


def test_analyze_requires_audio_field():
    r = client.post("/analyze")
    assert r.status_code == 422  # FastAPI validation (missing field)


def _minimal_wav_bytes() -> bytes:
    # 12-byte RIFF/WAVE header followed by arbitrary payload.
    return b"RIFF" + (100).to_bytes(4, "little") + b"WAVE" + b"junkpayload"


def test_analyze_returns_503_when_worker_unavailable():
    r = client.post(
        "/analyze", files={"audio": ("x.wav", io.BytesIO(_minimal_wav_bytes()), "audio/wav")}
    )
    # worker disabled in the test environment -> not a mock result, a clear error
    assert r.status_code == 503
    assert "ready" in r.json()["detail"].lower() or "worker" in r.json()["detail"].lower()


def test_analyze_maps_inference_error_to_422(monkeypatch):
    def boom(*_args, **_kwargs):
        raise InferenceError("simulated feature-dimension mismatch")

    monkeypatch.setattr(bridge, "analyze", boom)
    # Force the bridge into a "ready" state for this test only.
    monkeypatch.setattr(type(bridge), "health", lambda self: {
        "matlab_available": True, "model_available": True,
        "worker_state": "ready", "worker_detail": None, "matlab_version": "test",
    })
    r = client.post(
        "/analyze", files={"audio": ("x.wav", io.BytesIO(_minimal_wav_bytes()), "audio/wav")}
    )
    assert r.status_code == 422
    assert "featur" in r.json()["detail"].lower() or "analys" in r.json()["detail"].lower()

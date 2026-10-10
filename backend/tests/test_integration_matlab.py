"""Genuine end-to-end inference test (opt-in).

Run with a real MATLAB install:

    set PULMOSENSE_RUN_MATLAB_TESTS=1
    py -m pytest backend/tests/test_integration_matlab.py -s

This starts the actual MATLAB worker, uploads real WAV recordings, and checks
that predictions depend on the signal (not the filename) and that the response
matches the dashboard contract.
"""
from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path

import pytest

from app.config import Settings
from app.matlab_bridge import MatlabBridge

RUN = os.environ.get("PULMOSENSE_RUN_MATLAB_TESTS") == "1"
pytestmark = pytest.mark.skipif(not RUN, reason="set PULMOSENSE_RUN_MATLAB_TESTS=1")

SAMPLE_RATES = Path(__file__).resolve().parents[2] / "dashboard" / "samples"
ICBHI_DIR = (
    Path(__file__).resolve().parents[2] / "data" / "ICBHI_final_database"
)


@pytest.fixture(scope="module")
def bridge():
    s = Settings()
    s.worker_enabled = True  # conftest disables it for the fast unit tests
    b = MatlabBridge(s)
    b.start()
    ready = b.wait_until_ready(timeout=s.startup_timeout_s)
    if not ready:
        pytest.skip(f"MATLAB worker not ready: {b._state} / {b._detail}")
    yield b
    b.stop()


def _analyze(bridge: MatlabBridge, wav: Path):
    return bridge.analyze(wav)


def test_health_reports_ready(bridge):
    h = bridge.health()
    assert h["worker_state"] == "ready"
    assert h["model_available"] is True


def test_real_inference_on_icbhi(bridge):
    wavs = sorted(ICBHI_DIR.glob("*.wav"))
    if not wavs:
        pytest.skip("ICBHI database not present")
    r = _analyze(bridge, wavs[0])
    assert r["meta"]["isDemo"] is False
    assert r["meta"]["engine"].startswith("MATLAB")
    assert r["prediction"]["key"] in {"normal", "crackle", "wheeze", "crackleWheeze"}
    assert r["features"]["total"] == 101
    assert len(r["features"]["features"]) == 101
    assert len(r["machineLearning"]["models"]) == 4
    assert 0.0 <= r["prediction"]["confidence"] <= 100.0


def test_prediction_is_not_filename_based(bridge):
    wavs = sorted(ICBHI_DIR.glob("*.wav"))
    if not wavs:
        pytest.skip("ICBHI database not present")
    src = wavs[0]
    tmp = Path(tempfile.mkdtemp(prefix="pulmosense_test_"))
    try:
        renamed = tmp / "completely_different_name.wav"
        shutil.copyfile(src, renamed)
        r1 = _analyze(bridge, src)
        r2 = _analyze(bridge, renamed)
        assert r1["prediction"]["key"] == r2["prediction"]["key"]
        assert r1["classScores"] == r2["classScores"]
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

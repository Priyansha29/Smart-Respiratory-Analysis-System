"""Bridge unit tests (no MATLAB process is started)."""
from __future__ import annotations

import pytest

from app.config import Settings
from app.matlab_bridge import MatlabBridge, MatlabUnavailable


def _settings(tmp_path) -> Settings:
    s = Settings()
    s.job_dir = tmp_path / "jobs"
    s.worker_enabled = True
    return s


def test_disabled_by_configuration(tmp_path):
    s = _settings(tmp_path)
    s.worker_enabled = False
    b = MatlabBridge(s)
    b.start()
    assert b._state == "disabled"
    assert b.health()["worker_state"] == "disabled"


def test_missing_model_marks_failed(tmp_path):
    s = _settings(tmp_path)
    fake_matlab = tmp_path / "matlab.exe"
    fake_matlab.write_text("stub")
    s.matlab_exe = str(fake_matlab)
    s.model_file = tmp_path / "absent.mat"
    b = MatlabBridge(s)
    b.start()  # returns synchronously because the model is missing
    assert b._state == "failed"
    assert "model" in b._detail.lower()
    assert b.health()["model_available"] is False


def test_missing_matlab_marks_failed(tmp_path):
    s = _settings(tmp_path)
    s.matlab_exe = "definitely-not-matlab-xyz-123"
    s.model_file = tmp_path / "model.mat"
    s.model_file.write_bytes(b"stub")
    b = MatlabBridge(s)
    b.start()
    assert b._state == "failed"
    assert "matlab" in b._detail.lower()


def test_analyze_when_not_ready_raises(tmp_path):
    s = _settings(tmp_path)
    b = MatlabBridge(s)  # state == "stopped"
    with pytest.raises(MatlabUnavailable):
        b.analyze(tmp_path / "recording.wav")

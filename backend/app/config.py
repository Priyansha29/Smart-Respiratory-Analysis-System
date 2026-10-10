"""Runtime configuration for the PulmoSense FastAPI backend.

All paths can be overridden with environment variables so the same code runs
on another machine without edits. Nothing here is written back to the MATLAB
research project.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path


def _project_root() -> Path:
    # backend/app/config.py -> backend/app -> backend -> <project root>
    return Path(__file__).resolve().parents[2]


def _default_matlab() -> str:
    """Prefer an explicit env var, else a common Windows install, else PATH."""
    explicit = os.environ.get("PULMOSENSE_MATLAB_EXE")
    if explicit:
        return explicit
    for candidate in (
        r"C:\Program Files\MATLAB\R2024a\bin\matlab.exe",
        r"C:\Program Files\MATLAB\R2023b\bin\matlab.exe",
        r"C:\Program Files\MATLAB\R2023a\bin\matlab.exe",
    ):
        if Path(candidate).exists():
            return candidate
    return "matlab"


class Settings:
    def __init__(self) -> None:
        self.project_root = Path(
            os.environ.get("PULMOSENSE_PROJECT_ROOT", str(_project_root()))
        ).resolve()

        self.matlab_exe = os.environ.get("PULMOSENSE_MATLAB_EXE") or _default_matlab()

        self.job_dir = Path(
            os.environ.get(
                "PULMOSENSE_JOB_DIR", str(Path(tempfile.gettempdir()) / "pulmosense_jobs")
            )
        ).resolve()

        self.model_file = Path(
            os.environ.get(
                "PULMOSENSE_MODEL_FILE",
                str(self.project_root / "Part4_TrainedModels.mat"),
            )
        ).resolve()

        self.part5_file = Path(
            os.environ.get(
                "PULMOSENSE_PART5_FILE",
                str(self.model_file.parent / "Part5_AdvancedAnalysis.mat"),
            )
        ).resolve()

        self.max_upload_mb = float(os.environ.get("PULMOSENSE_MAX_UPLOAD_MB", "50"))
        self.startup_timeout_s = float(
            os.environ.get("PULMOSENSE_STARTUP_TIMEOUT_S", "300")
        )
        self.inference_timeout_s = float(
            os.environ.get("PULMOSENSE_INFERENCE_TIMEOUT_S", "180")
        )
        self.worker_enabled = os.environ.get(
            "PULMOSENSE_WORKER_ENABLED", "1"
        ).lower() not in {"0", "false", "no"}

        origins = os.environ.get(
            "PULMOSENSE_ALLOWED_ORIGINS",
            "http://127.0.0.1:5173,http://localhost:5173",
        )
        self.allowed_origins = [o.strip() for o in origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return int(self.max_upload_mb * 1024 * 1024)

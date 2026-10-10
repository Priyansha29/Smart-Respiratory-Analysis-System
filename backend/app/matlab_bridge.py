"""Bridge between FastAPI and the persistent MATLAB inference worker.

MATLAB Engine for Python is *not* used: MATLAB R2024a ships an engine that
supports only Python 3.9-3.11, while this machine has Python 3.13. Instead we
launch the MATLAB interpreter once (``matlab -batch inferenceWorker(...)``) and
talk to it through a small file-based JSON queue. This reuses the saved
trained models and never retrains anything.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Any


class MatlabUnavailable(RuntimeError):
    """Raised when the MATLAB worker is not (yet) able to serve requests."""


class InferenceError(RuntimeError):
    """Raised when MATLAB ran but could not analyse the recording."""


class MatlabBridge:
    STATES = {"stopped", "disabled", "starting", "ready", "failed"}

    def __init__(self, settings) -> None:
        self.settings = settings
        self._lock = threading.Lock()
        self._proc: subprocess.Popen | None = None
        self._state = "stopped"
        self._detail = ""
        self._ready_info: dict[str, Any] = {}
        self._boot_thread: threading.Thread | None = None

    # ------------------------------------------------------------------ checks
    def matlab_available(self) -> bool:
        exe = self.settings.matlab_exe
        if Path(exe).exists():
            return True
        return shutil.which(exe) is not None

    def model_available(self) -> bool:
        return self.settings.model_file.exists()

    # --------------------------------------------------------------- lifecycle
    def start(self) -> None:
        if not self.settings.worker_enabled:
            self._state = "disabled"
            self._detail = "MATLAB worker disabled by configuration"
            return
        self.settings.job_dir.mkdir(parents=True, exist_ok=True)
        if not self.matlab_available():
            self._state = "failed"
            self._detail = "MATLAB executable not found"
            return
        if not self.model_available():
            self._state = "failed"
            self._detail = "trained model artifact not found"
            return
        self._state = "starting"
        self._boot_thread = threading.Thread(
            target=self._boot, name="matlab-boot", daemon=True
        )
        self._boot_thread.start()

    def _boot(self) -> None:
        try:
            self._retire_stale_worker()
            self._cleanup_markers()
            job_dir_str = str(self.settings.job_dir)
            inference_dir = str(self.settings.project_root / "inference")
            # MATLAB must find inferenceWorker before it is called.
            command = f"addpath('{inference_dir}'); inferenceWorker('{job_dir_str}')"
            log_path = self.settings.job_dir / "matlab_worker.log"
            self._log = open(log_path, "ab")
            self._proc = subprocess.Popen(
                [self.settings.matlab_exe, "-batch", command],
                cwd=str(self.settings.project_root),
                stdout=self._log,
                stderr=subprocess.STDOUT,
                env=self._env(),
            )
            ready = self.settings.job_dir / "worker_ready.json"
            err = self.settings.job_dir / "worker_error.json"
            deadline = time.time() + self.settings.startup_timeout_s
            while time.time() < deadline:
                if err.exists():
                    self._state = "failed"
                    self._detail = str(self._read_json(err).get("error", "init failed"))
                    return
                if ready.exists():
                    self._ready_info = self._read_json(ready)
                    self._state = "ready"
                    self._detail = ""
                    return
                if self._proc.poll() is not None:
                    self._state = "failed"
                    self._detail = "MATLAB worker exited during startup"
                    return
                time.sleep(0.5)
            self._state = "failed"
            self._detail = "timed out waiting for the MATLAB worker to start"
        except Exception as exc:  # pragma: no cover - defensive
            self._state = "failed"
            self._detail = str(exc)

    def _retire_stale_worker(self) -> None:
        """Ask a worker left over from a previous run to exit before we start.

        A worker whose FastAPI parent was force-killed (no graceful shutdown)
        keeps polling the shared job directory. If it is still alive it would
        compete with — and could serve stale code to — the new worker, so we
        signal it to stop and give it a moment to exit.
        """
        stop = self.settings.job_dir / "worker_stop"
        try:
            stop.write_text("stop", encoding="utf-8")
        except OSError:
            return
        time.sleep(3.0)

    def stop(self) -> None:
        try:
            (self.settings.job_dir / "worker_stop").write_text("stop", encoding="utf-8")
        except OSError:
            pass
        if self._proc is not None:
            try:
                self._proc.wait(timeout=20)
            except Exception:  # pragma: no cover - best effort
                try:
                    self._proc.terminate()
                except Exception:
                    pass

    def wait_until_ready(self, timeout: float | None = None) -> bool:
        deadline = time.time() + (timeout or self.settings.startup_timeout_s)
        while time.time() < deadline:
            if self._state in {"ready", "failed", "disabled"}:
                return self._state == "ready"
            time.sleep(0.25)
        return self._state == "ready"

    # ---------------------------------------------------------------- analysis
    def analyze(self, wav_path: Path, opts: dict | None = None,
                timeout: float | None = None) -> dict[str, Any]:
        if self._state != "ready":
            raise MatlabUnavailable(
                self._detail or f"MATLAB inference worker is not ready ({self._state})"
            )
        timeout = timeout or self.settings.inference_timeout_s
        job_id = "job_" + uuid.uuid4().hex
        req_path = self.settings.job_dir / f"{job_id}.req.json"
        res_path = self.settings.job_dir / f"{job_id}.res.json"

        self._atomic_write_json(req_path, {"audioPath": str(wav_path), "opts": opts or {}})

        deadline = time.time() + timeout
        while time.time() < deadline:
            if self._state == "failed":
                raise MatlabUnavailable(self._detail or "MATLAB worker failed")
            if self._proc is not None and self._proc.poll() is not None:
                self._state = "failed"
                self._detail = "MATLAB worker exited unexpectedly"
                raise MatlabUnavailable(self._detail)
            if res_path.exists():
                payload = self._read_json(res_path)
                try:
                    res_path.unlink()
                except OSError:
                    pass
                if not payload.get("ok"):
                    raise InferenceError(str(payload.get("error", "inference failed")))
                return payload["result"]
            time.sleep(0.2)
        raise InferenceError("inference timed out")

    # ------------------------------------------------------------------ health
    def health(self) -> dict[str, Any]:
        return {
            "matlab_available": self.matlab_available(),
            "model_available": self.model_available(),
            "worker_state": self._state,
            "worker_detail": self._detail or None,
            "matlab_version": self._ready_info.get("matlabVersion"),
        }

    # ------------------------------------------------------------------ helpers
    def _cleanup_markers(self) -> None:
        for name in ("worker_ready.json", "worker_error.json", "worker_stop"):
            p = self.settings.job_dir / name
            try:
                if p.exists():
                    p.unlink()
            except OSError:
                pass

    def _env(self) -> dict[str, str]:
        import os

        env = dict(os.environ)
        env.setdefault("MATLAB_WORKER", "1")
        return env

    @staticmethod
    def _atomic_write_json(path: Path, value: Any) -> None:
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(json.dumps(value), encoding="utf-8")
        tmp.replace(path)

    @staticmethod
    def _read_json(path: Path) -> dict[str, Any]:
        for _ in range(10):
            try:
                text = path.read_text(encoding="utf-8")
                if text.strip():
                    return json.loads(text)
            except (OSError, json.JSONDecodeError):
                pass
            time.sleep(0.05)
        return {}


# Convenience for __main__ style debugging (not used by the API).
if __name__ == "__main__":  # pragma: no cover
    from .config import Settings

    s = Settings()
    bridge = MatlabBridge(s)
    bridge.start()
    ok = bridge.wait_until_ready()
    print(f"ready={ok} state={bridge._state} detail={bridge._detail}", file=sys.stderr)
    bridge.stop()

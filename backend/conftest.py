"""Test bootstrap.

Puts the ``backend`` directory on ``sys.path`` (so ``import app...`` works) and
disables the MATLAB worker for the fast unit tests. Genuine-inference tests are
opt-in via PULMOSENSE_RUN_MATLAB_TESTS=1 and build their own bridge.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

# Do not spawn MATLAB from the ordinary unit-test suite.
os.environ.setdefault("PULMOSENSE_WORKER_ENABLED", "0")

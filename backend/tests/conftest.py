"""Test bootstrap — isolates the SQLite DB into a tempfile before backend imports."""

import os
import sys
import tempfile
from pathlib import Path

# Point db.py at a fresh temp DB before anything imports it.
_tmp = Path(tempfile.mkdtemp(prefix="ro_test_")) / "test.db"
os.environ["RO_DB_PATH"] = str(_tmp)
# Deterministic JWT secret for tests.
os.environ.setdefault("RO_AUTH_SECRET", "test-secret-do-not-use-in-prod")

# Make `backend/` importable when running `pytest` from the repo root or backend/.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import db as _db  # noqa: E402
_db.init()

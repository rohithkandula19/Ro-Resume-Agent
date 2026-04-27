"""Simple file-based session storage + version history."""

import json
import os
import time
import uuid
from pathlib import Path
from typing import Any

BASE = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) / "output" / "sessions"
BASE.mkdir(parents=True, exist_ok=True)


def new_session_id() -> str:
    return uuid.uuid4().hex[:12]


def _path(sid: str) -> Path:
    return BASE / f"{sid}.json"


def load(sid: str) -> dict:
    p = _path(sid)
    if not p.exists():
        return {"id": sid, "versions": [], "state": {}}
    return json.loads(p.read_text())


def save(sid: str, data: dict) -> None:
    _path(sid).write_text(json.dumps(data, indent=2))


def update_state(sid: str, **kwargs) -> dict:
    data = load(sid)
    data["state"].update(kwargs)
    save(sid, data)
    return data


def add_version(sid: str, label: str, resume: dict, meta: dict[str, Any] | None = None) -> dict:
    data = load(sid)
    version = {
        "id": uuid.uuid4().hex[:8],
        "label": label,
        "created_at": int(time.time()),
        "resume": resume,
        "meta": meta or {},
    }
    data.setdefault("versions", []).append(version)
    save(sid, data)
    return version


def list_versions(sid: str) -> list[dict]:
    return load(sid).get("versions", [])


def get_version(sid: str, vid: str) -> dict | None:
    for v in list_versions(sid):
        if v["id"] == vid:
            return v
    return None

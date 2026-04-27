"""Anonymous session storage backed by Firestore (replaces local JSON files)."""

import time
import uuid
from typing import Any

from firebase_init import get_db
from google.cloud import firestore as _fs


def new_session_id() -> str:
    return uuid.uuid4().hex[:12]


def load(sid: str) -> dict:
    doc = get_db().collection("sessions").document(sid).get()
    if not doc.exists:
        return {"id": sid, "versions": [], "state": {}}
    return doc.to_dict()


def save(sid: str, data: dict) -> None:
    get_db().collection("sessions").document(sid).set(data)


def update_state(sid: str, **kwargs) -> dict:
    data = load(sid)
    data.setdefault("state", {}).update(kwargs)
    save(sid, data)
    return data


def add_version(sid: str, label: str, resume: dict,
                meta: dict[str, Any] | None = None) -> dict:
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

"""Firestore-backed persistence (replaces SQLite)."""
import json
import time
from typing import Optional

from google.cloud import firestore as _fs

from firebase_init import get_db


def now() -> int:
    return int(time.time())


def init() -> None:
    """No-op — Firestore needs no schema initialisation."""
    pass


# ── user profile ──────────────────────────────────────────────────────────────

def get_user_profile(uid: str) -> dict:
    doc = get_db().collection("users").document(uid).get()
    return doc.to_dict() or {} if doc.exists else {}


def set_user_profile(uid: str, **fields) -> None:
    get_db().collection("users").document(uid).set(fields, merge=True)


# ── per-user sessions ─────────────────────────────────────────────────────────

def upsert_user_session(uid: str, sid: str, label: str, role: str,
                        jd_text: str, resume_text: str, state_json: str) -> dict:
    t = now()
    ref = get_db().collection("users").document(uid).collection("sessions").document(sid)
    if ref.get().exists:
        ref.update({"label": label, "role": role, "jd_text": jd_text,
                    "resume_text": resume_text, "state_json": state_json, "updated_at": t})
    else:
        ref.set({"id": sid, "user_id": uid, "label": label, "role": role,
                 "jd_text": jd_text, "resume_text": resume_text,
                 "state_json": state_json, "created_at": t, "updated_at": t})
    return {"id": sid, "updated_at": t}


def list_user_sessions(uid: str) -> list:
    docs = (
        get_db().collection("users").document(uid).collection("sessions")
        .order_by("updated_at", direction=_fs.Query.DESCENDING)
        .limit(50).stream()
    )
    out = []
    for d in docs:
        r = d.to_dict()
        out.append({
            "id": r.get("id"),
            "label": r.get("label", ""),
            "created_at": r.get("created_at", 0),
            "updated_at": r.get("updated_at", 0),
            "role": r.get("role", ""),
            "jd_preview": (r.get("jd_text") or "")[:180],
            "resume_chars": len(r.get("resume_text") or ""),
        })
    return out


def get_user_session(uid: str, sid: str) -> Optional[dict]:
    doc = get_db().collection("users").document(uid).collection("sessions").document(sid).get()
    if not doc.exists:
        return None
    row = doc.to_dict()
    try:
        row["state"] = json.loads(row.pop("state_json") or "{}")
    except Exception:
        row["state"] = {}
    return row


def delete_user_session(uid: str, sid: str) -> None:
    get_db().collection("users").document(uid).collection("sessions").document(sid).delete()


# ── downloads ─────────────────────────────────────────────────────────────────

def log_download(uid: str, sid: str, kind: str, filename: str) -> None:
    get_db().collection("users").document(uid).collection("downloads").add(
        {"user_id": uid, "session_id": sid, "kind": kind,
         "filename": filename, "created_at": now()}
    )


def list_downloads(uid: str) -> list:
    docs = (
        get_db().collection("users").document(uid).collection("downloads")
        .order_by("created_at", direction=_fs.Query.DESCENDING)
        .limit(50).stream()
    )
    return [{"id": d.id, **d.to_dict()} for d in docs]


# ── applications ──────────────────────────────────────────────────────────────

def create_application(uid: str, data: dict) -> dict:
    t = now()
    _, ref = get_db().collection("users").document(uid).collection("applications").add(
        {**data, "user_id": uid, "created_at": t, "updated_at": t}
    )
    return {"id": ref.id, "updated_at": t}


def list_applications(uid: str) -> list:
    docs = (
        get_db().collection("users").document(uid).collection("applications")
        .order_by("updated_at", direction=_fs.Query.DESCENDING).stream()
    )
    return [{"id": d.id, **d.to_dict()} for d in docs]


def update_application(uid: str, aid: str, fields: dict) -> dict:
    fields["updated_at"] = now()
    ref = get_db().collection("users").document(uid).collection("applications").document(aid)
    if not ref.get().exists:
        raise KeyError("Application not found")
    ref.update(fields)
    return {"ok": True, "updated_at": fields["updated_at"]}


def delete_application(uid: str, aid: str) -> None:
    ref = get_db().collection("users").document(uid).collection("applications").document(aid)
    if not ref.get().exists:
        raise KeyError("Application not found")
    ref.delete()


# ── offers ────────────────────────────────────────────────────────────────────

def upsert_offer(uid: str, oid: Optional[str], data: dict) -> dict:
    t = now()
    col = get_db().collection("users").document(uid).collection("offers")
    if oid:
        ref = col.document(oid)
        if not ref.get().exists:
            raise KeyError("Offer not found")
        ref.update({**data, "updated_at": t})
        return {"id": oid, "updated_at": t}
    data.update({"user_id": uid, "created_at": t, "updated_at": t})
    _, ref = col.add(data)
    return {"id": ref.id, "updated_at": t}


def list_offers(uid: str) -> list:
    docs = (
        get_db().collection("users").document(uid).collection("offers")
        .order_by("updated_at", direction=_fs.Query.DESCENDING).stream()
    )
    return [{"id": d.id, **d.to_dict()} for d in docs]


def delete_offer(uid: str, oid: str) -> None:
    ref = get_db().collection("users").document(uid).collection("offers").document(oid)
    if not ref.get().exists:
        raise KeyError("Offer not found")
    ref.delete()


# ── LLM usage ─────────────────────────────────────────────────────────────────

def log_usage(uid: Optional[str], endpoint: str, provider: str, model: str,
              prompt_tokens: int, completion_tokens: int, cost_usd: float) -> None:
    if not uid:
        return
    get_db().collection("users").document(uid).collection("usage").add({
        "user_id": uid, "endpoint": endpoint, "provider": provider, "model": model,
        "prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens,
        "cost_usd": cost_usd, "created_at": now(),
    })


def get_usage_summary(uid: str) -> dict:
    docs = list(
        get_db().collection("users").document(uid).collection("usage")
        .order_by("created_at", direction=_fs.Query.DESCENDING)
        .limit(500).stream()
    )
    rows = [d.to_dict() for d in docs]
    totals = {
        "calls": len(rows),
        "prompt": sum(r.get("prompt_tokens", 0) for r in rows),
        "completion": sum(r.get("completion_tokens", 0) for r in rows),
        "total": sum(r.get("total_tokens", 0) for r in rows),
        "cost": sum(r.get("cost_usd", 0.0) for r in rows),
    }
    ep_map: dict = {}
    model_map: dict = {}
    for r in rows:
        ep = r.get("endpoint", "")
        e = ep_map.setdefault(ep, {"endpoint": ep, "calls": 0, "tokens": 0, "cost": 0.0})
        e["calls"] += 1; e["tokens"] += r.get("total_tokens", 0); e["cost"] += r.get("cost_usd", 0.0)
        key = f"{r.get('provider')}|{r.get('model')}"
        m = model_map.setdefault(key, {"provider": r.get("provider"), "model": r.get("model"),
                                       "calls": 0, "tokens": 0, "cost": 0.0})
        m["calls"] += 1; m["tokens"] += r.get("total_tokens", 0); m["cost"] += r.get("cost_usd", 0.0)
    recent = [
        {"endpoint": r.get("endpoint"), "provider": r.get("provider"), "model": r.get("model"),
         "total_tokens": r.get("total_tokens", 0), "cost_usd": r.get("cost_usd", 0.0),
         "created_at": r.get("created_at", 0)}
        for r in rows[:30]
    ]
    return {
        "totals": totals,
        "by_endpoint": sorted(ep_map.values(), key=lambda x: x["tokens"], reverse=True)[:30],
        "by_model": sorted(model_map.values(), key=lambda x: x["tokens"], reverse=True)[:20],
        "recent": recent,
    }

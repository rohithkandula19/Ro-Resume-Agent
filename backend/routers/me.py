"""Auth + per-user endpoints — now backed by Firebase Auth + Firestore."""

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db as _db
import auth as _auth
from tools.extract_experience import extract_profile
from tools import session as _sess
from rate_limit import limit as _rl

router = APIRouter()


# ── models ────────────────────────────────────────────────────────────────────

class ExtractProfileRequest(BaseModel):
    resume_text: str


class SessionUpsertRequest(BaseModel):
    id: str | None = None
    label: str = ""
    role: str = ""
    jd_text: str = ""
    resume_text: str = ""
    state: dict = {}


class DownloadLogRequest(BaseModel):
    session_id: str = ""
    kind: str
    filename: str = ""


APP_STATUSES = {"saved", "applied", "interview", "offer", "rejected", "withdrawn"}


class ApplicationCreate(BaseModel):
    company: str
    role: str
    status: str = "saved"
    jd_url: str = ""
    applied_at: int | None = None
    next_step_at: int | None = None
    notes: str = ""
    salary_band: str = ""
    session_id: str = ""


class ApplicationUpdate(BaseModel):
    company: str | None = None
    role: str | None = None
    status: str | None = None
    jd_url: str | None = None
    applied_at: int | None = None
    next_step_at: int | None = None
    notes: str | None = None
    salary_band: str | None = None


# ── auth ──────────────────────────────────────────────────────────────────────
# Sign-up / sign-in / sign-out / password reset are all handled by the Firebase
# client SDK on the frontend. The backend only needs to verify Firebase ID tokens.

@router.get("/api/auth/me")
def me(user: dict = Depends(_auth.require_user)):
    """Return the caller's public profile, including any AI-extracted data from Firestore."""
    profile_data = _db.get_user_profile(user["uid"])
    profile_json = profile_data.get("profile_json")
    profile = None
    if profile_json:
        try:
            profile = json.loads(profile_json) if isinstance(profile_json, str) else profile_json
        except Exception:
            pass
    return _auth.public_user(user, profile)


def register_extract_profile(app, client_fn):
    """Wire /api/auth/extract-profile — needs the main app's client() function."""
    @app.post("/api/auth/extract-profile")
    def _ep(req: ExtractProfileRequest,
            user: dict = Depends(_auth.require_user),
            _=Depends(_rl("llm_light"))):
        profile = extract_profile(client_fn(), req.resume_text)
        _db.set_user_profile(user["uid"], profile_json=json.dumps(profile))
        return {"profile": profile}


# ── per-user sessions ─────────────────────────────────────────────────────────

@router.get("/api/me/sessions")
def list_sessions(user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_read"))):
    return _db.list_user_sessions(user["uid"])


@router.post("/api/me/sessions")
def upsert_session(req: SessionUpsertRequest,
                   user: dict = Depends(_auth.require_user),
                   _=Depends(_rl("crud_write"))):
    sid = req.id or _sess.new_session_id()
    return _db.upsert_user_session(
        user["uid"], sid, req.label, req.role,
        req.jd_text, req.resume_text, json.dumps(req.state or {}),
    )


@router.get("/api/me/sessions/{sid}")
def get_session(sid: str,
                user: dict = Depends(_auth.require_user),
                _=Depends(_rl("crud_read"))):
    row = _db.get_user_session(user["uid"], sid)
    if not row:
        raise HTTPException(404, "Session not found")
    return row


@router.delete("/api/me/sessions/{sid}")
def delete_session(sid: str,
                   user: dict = Depends(_auth.require_user),
                   _=Depends(_rl("crud_write"))):
    _db.delete_user_session(user["uid"], sid)
    return {"ok": True}


# ── downloads ─────────────────────────────────────────────────────────────────

@router.post("/api/me/downloads")
def download_log(req: DownloadLogRequest,
                 user: dict = Depends(_auth.require_user),
                 _=Depends(_rl("crud_write"))):
    _db.log_download(user["uid"], req.session_id or "", req.kind, req.filename)
    return {"ok": True}


@router.get("/api/me/downloads")
def downloads_list(user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_read"))):
    return _db.list_downloads(user["uid"])


# ── applications ──────────────────────────────────────────────────────────────

@router.get("/api/me/applications")
def apps_list(user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_read"))):
    return _db.list_applications(user["uid"])


@router.post("/api/me/applications")
def apps_create(req: ApplicationCreate,
                user: dict = Depends(_auth.require_user),
                _=Depends(_rl("crud_write"))):
    if not req.company.strip() or not req.role.strip():
        raise HTTPException(400, "company and role required")
    status = req.status if req.status in APP_STATUSES else "saved"
    return _db.create_application(user["uid"], {
        "company": req.company.strip(), "role": req.role.strip(),
        "status": status, "jd_url": req.jd_url,
        "applied_at": req.applied_at, "next_step_at": req.next_step_at,
        "notes": req.notes, "salary_band": req.salary_band,
        "session_id": req.session_id or "",
    })


@router.patch("/api/me/applications/{aid}")
def apps_update(aid: str, req: ApplicationUpdate,
                user: dict = Depends(_auth.require_user),
                _=Depends(_rl("crud_write"))):
    fields = req.dict(exclude_unset=True)
    if "status" in fields and fields["status"] not in APP_STATUSES:
        raise HTTPException(400, f"invalid status; must be one of {sorted(APP_STATUSES)}")
    if not fields:
        return {"ok": True}
    try:
        return _db.update_application(user["uid"], aid, fields)
    except KeyError:
        raise HTTPException(404, "Application not found")


@router.delete("/api/me/applications/{aid}")
def apps_delete(aid: str,
                user: dict = Depends(_auth.require_user),
                _=Depends(_rl("crud_write"))):
    try:
        _db.delete_application(user["uid"], aid)
    except KeyError:
        raise HTTPException(404, "Application not found")
    return {"ok": True}


# ── offers ────────────────────────────────────────────────────────────────────

class OfferUpsert(BaseModel):
    id: str | None = None
    company: str
    role: str
    location: str = ""
    base_salary: float = 0
    bonus_target: float = 0
    equity_per_year: float = 0
    signing_bonus: float = 0
    benefits_note: str = ""
    growth: float = 0
    culture: float = 0
    wlb: float = 0
    learning: float = 0
    notes: str = ""
    decision: str = ""


_OFFER_COLS = [
    "company", "role", "location", "base_salary", "bonus_target",
    "equity_per_year", "signing_bonus", "benefits_note",
    "growth", "culture", "wlb", "learning", "notes", "decision",
]


@router.get("/api/me/offers")
def offers_list(user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_read"))):
    return _db.list_offers(user["uid"])


@router.post("/api/me/offers")
def offers_upsert(req: OfferUpsert,
                  user: dict = Depends(_auth.require_user),
                  _=Depends(_rl("crud_write"))):
    if not req.company.strip() or not req.role.strip():
        raise HTTPException(400, "company and role required")
    data = {k: getattr(req, k) for k in _OFFER_COLS}
    try:
        return _db.upsert_offer(user["uid"], req.id, data)
    except KeyError:
        raise HTTPException(404, "Offer not found")


@router.delete("/api/me/offers/{oid}")
def offers_delete(oid: str,
                  user: dict = Depends(_auth.require_user),
                  _=Depends(_rl("crud_write"))):
    try:
        _db.delete_offer(user["uid"], oid)
    except KeyError:
        raise HTTPException(404, "Offer not found")
    return {"ok": True}


# ── LLM usage ─────────────────────────────────────────────────────────────────

@router.get("/api/me/usage")
def usage_summary(user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_read"))):
    return _db.get_usage_summary(user["uid"])

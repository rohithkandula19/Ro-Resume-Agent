"""Auth + per-user endpoints (sessions, downloads, applications)."""

import json

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

import db as _db
import auth as _auth
from tools.extract_experience import extract_profile
from tools import session as _sess
from rate_limit import limit as _rl

router = APIRouter()


# ---------- models ----------

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class ExtractProfileRequest(BaseModel):
    resume_text: str


class RequestResetRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


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


# ---------- auth ----------

@router.post("/api/auth/signup")
def signup(req: SignupRequest, _=Depends(_rl("auth"))):
    user = _auth.create_user(req.email, req.password, req.name)
    token = _auth.issue_token(user["id"])
    with _db.tx() as c:
        row = c.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
    return {"token": token, "user": _auth.public_user(dict(row))}


@router.post("/api/auth/login")
def login(req: LoginRequest, _=Depends(_rl("auth"))):
    user = _auth.authenticate(req.email, req.password)
    token = _auth.issue_token(user["id"])
    return {"token": token, "user": _auth.public_user(user)}


@router.post("/api/auth/logout")
def logout(authorization: str | None = Header(None)):
    token = _auth._extract_token(authorization)
    if token:
        _auth.revoke_token(token)
    return {"ok": True}


@router.get("/api/auth/me")
def me(user: dict = Depends(_auth.require_user)):
    return _auth.public_user(user)


@router.post("/api/auth/request-reset")
def request_reset(req: RequestResetRequest, _=Depends(_rl("auth"))):
    """Returns generic success regardless of email existence (prevents enumeration).
    If email exists, a reset token is created and (if SMTP is configured) emailed.
    In dev mode (no SMTP_HOST), the token is returned in the response."""
    import email_send as _mail
    token = _auth.create_reset_token(req.email)
    response: dict = {"ok": True, "message": "If that email is registered, a reset link has been created."}
    if token:
        if _mail.is_configured():
            _mail.send_password_reset(req.email, token)
        else:
            response["dev_token"] = token
            response["dev_note"] = "SMTP not configured — using dev token. Set SMTP_HOST to send email."
    return response


@router.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest, _=Depends(_rl("auth"))):
    ok = _auth.consume_reset_token(req.token, req.new_password)
    if not ok:
        raise HTTPException(400, "Invalid or expired reset token")
    return {"ok": True}


def _extract_with_client(client, resume_text: str) -> dict:
    return extract_profile(client, resume_text)


def register_extract_profile(app, client_fn):
    """Wire /api/auth/extract-profile — needs the main app's client() function."""
    @app.post("/api/auth/extract-profile")
    def _ep(req: ExtractProfileRequest, user: dict = Depends(_auth.require_user), _=Depends(_rl("llm_light"))):
        profile = extract_profile(client_fn(), req.resume_text)
        with _db.tx() as c:
            c.execute("UPDATE users SET profile_json=? WHERE id=?", (json.dumps(profile), user["id"]))
        return {"profile": profile}


# ---------- per-user sessions ----------

@router.get("/api/me/sessions")
def list_sessions(user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_read"))):
    with _db.tx() as c:
        rows = c.execute(
            """SELECT id, label, created_at, updated_at, role,
                      substr(coalesce(jd_text,''),1,180) AS jd_preview,
                      length(coalesce(resume_text,'')) AS resume_chars
               FROM user_sessions WHERE user_id=? ORDER BY updated_at DESC LIMIT 50""",
            (user["id"],),
        ).fetchall()
    return [dict(r) for r in rows]


@router.post("/api/me/sessions")
def upsert_session(req: SessionUpsertRequest, user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_write"))):
    sid = req.id or _sess.new_session_id()
    t = _db.now()
    state_json = json.dumps(req.state or {})
    with _db.tx() as c:
        existing = c.execute(
            "SELECT id FROM user_sessions WHERE id=? AND user_id=?", (sid, user["id"])
        ).fetchone()
        if existing:
            c.execute(
                """UPDATE user_sessions SET label=?, role=?, jd_text=?, resume_text=?,
                                            state_json=?, updated_at=?
                   WHERE id=? AND user_id=?""",
                (req.label, req.role, req.jd_text, req.resume_text, state_json, t, sid, user["id"]),
            )
        else:
            c.execute(
                """INSERT INTO user_sessions
                   (id, user_id, label, created_at, updated_at, role, jd_text, resume_text, state_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (sid, user["id"], req.label, t, t, req.role, req.jd_text, req.resume_text, state_json),
            )
    return {"id": sid, "updated_at": t}


@router.get("/api/me/sessions/{sid}")
def get_session(sid: str, user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_read"))):
    with _db.tx() as c:
        row = c.execute(
            "SELECT * FROM user_sessions WHERE id=? AND user_id=?", (sid, user["id"])
        ).fetchone()
    if not row:
        raise HTTPException(404, "Session not found")
    out = dict(row)
    try:
        out["state"] = json.loads(out.pop("state_json") or "{}")
    except Exception:
        out["state"] = {}
    return out


@router.delete("/api/me/sessions/{sid}")
def delete_session(sid: str, user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_write"))):
    with _db.tx() as c:
        c.execute("DELETE FROM user_sessions WHERE id=? AND user_id=?", (sid, user["id"]))
    return {"ok": True}


# ---------- downloads ----------

@router.post("/api/me/downloads")
def download_log(req: DownloadLogRequest, user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_write"))):
    with _db.tx() as c:
        c.execute(
            "INSERT INTO downloads(user_id, session_id, kind, filename, created_at) VALUES (?,?,?,?,?)",
            (user["id"], req.session_id or None, req.kind, req.filename, _db.now()),
        )
    return {"ok": True}


@router.get("/api/me/downloads")
def downloads_list(user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_read"))):
    with _db.tx() as c:
        rows = c.execute(
            "SELECT id, session_id, kind, filename, created_at FROM downloads WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
            (user["id"],),
        ).fetchall()
    return [dict(r) for r in rows]


# ---------- applications ----------

@router.get("/api/me/applications")
def apps_list(user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_read"))):
    with _db.tx() as c:
        rows = c.execute(
            """SELECT id, session_id, company, role, status, jd_url, applied_at,
                      next_step_at, notes, salary_band, created_at, updated_at
               FROM applications WHERE user_id=? ORDER BY updated_at DESC""",
            (user["id"],),
        ).fetchall()
    return [dict(r) for r in rows]


@router.post("/api/me/applications")
def apps_create(req: ApplicationCreate, user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_write"))):
    if not req.company.strip() or not req.role.strip():
        raise HTTPException(400, "company and role required")
    status = req.status if req.status in APP_STATUSES else "saved"
    t = _db.now()
    with _db.tx() as c:
        cur = c.execute(
            """INSERT INTO applications
               (user_id, session_id, company, role, status, jd_url, applied_at,
                next_step_at, notes, salary_band, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (user["id"], req.session_id or None, req.company.strip(), req.role.strip(),
             status, req.jd_url, req.applied_at, req.next_step_at,
             req.notes, req.salary_band, t, t),
        )
        aid = cur.lastrowid
    return {"id": aid, "updated_at": t}


@router.patch("/api/me/applications/{aid}")
def apps_update(aid: int, req: ApplicationUpdate, user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_write"))):
    fields = req.dict(exclude_unset=True)
    if "status" in fields and fields["status"] not in APP_STATUSES:
        raise HTTPException(400, f"invalid status; must be one of {sorted(APP_STATUSES)}")
    if not fields:
        return {"ok": True}
    fields["updated_at"] = _db.now()
    assigns = ", ".join(f"{k}=?" for k in fields.keys())
    values = list(fields.values()) + [aid, user["id"]]
    with _db.tx() as c:
        cur = c.execute(
            f"UPDATE applications SET {assigns} WHERE id=? AND user_id=?",
            values,
        )
        if cur.rowcount == 0:
            raise HTTPException(404, "Application not found")
    return {"ok": True, "updated_at": fields["updated_at"]}


@router.delete("/api/me/applications/{aid}")
def apps_delete(aid: int, user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_write"))):
    with _db.tx() as c:
        cur = c.execute("DELETE FROM applications WHERE id=? AND user_id=?", (aid, user["id"]))
        if cur.rowcount == 0:
            raise HTTPException(404, "Application not found")
    return {"ok": True}


# ---------- offers ----------

class OfferUpsert(BaseModel):
    id: int | None = None
    company: str
    role: str
    location: str = ""
    base_salary: float = 0
    bonus_target: float = 0
    equity_per_year: float = 0
    signing_bonus: float = 0
    benefits_note: str = ""
    growth: float = 0        # 0-10 subjective
    culture: float = 0
    wlb: float = 0
    learning: float = 0
    notes: str = ""
    decision: str = ""       # "accepted" | "rejected" | "" (undecided)


_OFFER_COLS = [
    "company", "role", "location", "base_salary", "bonus_target",
    "equity_per_year", "signing_bonus", "benefits_note",
    "growth", "culture", "wlb", "learning", "notes", "decision",
]


@router.get("/api/me/offers")
def offers_list(user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_read"))):
    with _db.tx() as c:
        rows = c.execute(
            "SELECT * FROM offers WHERE user_id=? ORDER BY updated_at DESC",
            (user["id"],),
        ).fetchall()
    return [dict(r) for r in rows]


@router.post("/api/me/offers")
def offers_upsert(req: OfferUpsert, user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_write"))):
    if not req.company.strip() or not req.role.strip():
        raise HTTPException(400, "company and role required")
    t = _db.now()
    values = [getattr(req, k) for k in _OFFER_COLS]
    with _db.tx() as c:
        if req.id:
            assigns = ", ".join(f"{k}=?" for k in _OFFER_COLS)
            cur = c.execute(
                f"UPDATE offers SET {assigns}, updated_at=? WHERE id=? AND user_id=?",
                (*values, t, req.id, user["id"]),
            )
            if cur.rowcount == 0:
                raise HTTPException(404, "Offer not found")
            return {"id": req.id, "updated_at": t}
        cols = ", ".join(_OFFER_COLS)
        qs = ", ".join(["?"] * len(_OFFER_COLS))
        cur = c.execute(
            f"INSERT INTO offers (user_id, {cols}, created_at, updated_at) VALUES (?, {qs}, ?, ?)",
            (user["id"], *values, t, t),
        )
        return {"id": cur.lastrowid, "updated_at": t}


@router.delete("/api/me/offers/{oid}")
def offers_delete(oid: int, user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_write"))):
    with _db.tx() as c:
        cur = c.execute("DELETE FROM offers WHERE id=? AND user_id=?", (oid, user["id"]))
        if cur.rowcount == 0:
            raise HTTPException(404, "Offer not found")
    return {"ok": True}


# ---------- LLM usage ----------

@router.get("/api/me/usage")
def usage_summary(user: dict = Depends(_auth.require_user), _=Depends(_rl("crud_read"))):
    """Return totals + per-endpoint + recent rows for the current user."""
    with _db.tx() as c:
        totals = c.execute(
            """SELECT COUNT(*) AS calls,
                      COALESCE(SUM(prompt_tokens),0) AS prompt,
                      COALESCE(SUM(completion_tokens),0) AS completion,
                      COALESCE(SUM(total_tokens),0) AS total,
                      COALESCE(SUM(cost_usd),0) AS cost
               FROM llm_usage WHERE user_id=?""",
            (user["id"],),
        ).fetchone()
        by_ep = c.execute(
            """SELECT endpoint, COUNT(*) AS calls,
                      COALESCE(SUM(total_tokens),0) AS tokens,
                      COALESCE(SUM(cost_usd),0) AS cost
               FROM llm_usage WHERE user_id=?
               GROUP BY endpoint ORDER BY tokens DESC LIMIT 30""",
            (user["id"],),
        ).fetchall()
        by_model = c.execute(
            """SELECT provider, model, COUNT(*) AS calls,
                      COALESCE(SUM(total_tokens),0) AS tokens,
                      COALESCE(SUM(cost_usd),0) AS cost
               FROM llm_usage WHERE user_id=?
               GROUP BY provider, model ORDER BY tokens DESC LIMIT 20""",
            (user["id"],),
        ).fetchall()
        recent = c.execute(
            """SELECT endpoint, provider, model, total_tokens, cost_usd, created_at
               FROM llm_usage WHERE user_id=?
               ORDER BY created_at DESC LIMIT 30""",
            (user["id"],),
        ).fetchall()
    return {
        "totals": dict(totals) if totals else {},
        "by_endpoint": [dict(r) for r in by_ep],
        "by_model": [dict(r) for r in by_model],
        "recent": [dict(r) for r in recent],
    }

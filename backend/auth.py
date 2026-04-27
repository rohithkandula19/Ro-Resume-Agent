"""Auth: password hashing (pbkdf2_hmac, stdlib), opaque session tokens."""

import hashlib
import hmac
import json
import secrets
from typing import Optional

from fastapi import Header, HTTPException

from db import tx, now

PBKDF2_ITERS = 200_000
TOKEN_TTL_DAYS = 30


def hash_password(password: str, salt: Optional[bytes] = None) -> str:
    if salt is None:
        salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERS)
    return f"pbkdf2${PBKDF2_ITERS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, iters, salt_hex, dk_hex = stored.split("$")
        if scheme != "pbkdf2":
            return False
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(dk_hex)
        computed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iters))
        return hmac.compare_digest(expected, computed)
    except Exception:
        return False


def create_user(email: str, password: str, name: str = "") -> dict:
    email = email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Invalid email")
    if len(password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    pw_hash = hash_password(password)
    with tx() as c:
        try:
            cur = c.execute(
                "INSERT INTO users(email, name, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (email, name.strip(), pw_hash, now()),
            )
        except Exception:
            raise HTTPException(409, "Email already registered")
        uid = cur.lastrowid
    return {"id": uid, "email": email, "name": name}


def authenticate(email: str, password: str) -> dict:
    email = email.strip().lower()
    with tx() as c:
        row = c.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not row or not verify_password(password, row["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    return dict(row)


def issue_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    ts = now()
    expires = ts + TOKEN_TTL_DAYS * 86400
    with tx() as c:
        c.execute(
            "INSERT INTO auth_tokens(token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_id, ts, expires),
        )
    return token


def revoke_token(token: str) -> None:
    with tx() as c:
        c.execute("DELETE FROM auth_tokens WHERE token=?", (token,))


RESET_TTL_SECONDS = 60 * 60  # 1 hour


def create_reset_token(email: str) -> Optional[str]:
    """Create a password-reset token for a user. Returns None if email doesn't exist
    (caller should still return generic success to prevent email enumeration)."""
    email = email.strip().lower()
    with tx() as c:
        row = c.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
        if not row:
            return None
        token = secrets.token_urlsafe(32)
        ts = now()
        c.execute(
            "INSERT INTO password_resets(token, user_id, created_at, expires_at) VALUES (?,?,?,?)",
            (token, row["id"], ts, ts + RESET_TTL_SECONDS),
        )
    return token


def consume_reset_token(token: str, new_password: str) -> bool:
    if len(new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    with tx() as c:
        row = c.execute(
            "SELECT * FROM password_resets WHERE token=? AND used_at IS NULL AND expires_at > ?",
            (token, now()),
        ).fetchone()
        if not row:
            return False
        pw_hash = hash_password(new_password)
        c.execute("UPDATE users SET password_hash=? WHERE id=?", (pw_hash, row["user_id"]))
        c.execute("UPDATE password_resets SET used_at=? WHERE token=?", (now(), token))
        # Revoke all existing auth tokens for safety
        c.execute("DELETE FROM auth_tokens WHERE user_id=?", (row["user_id"],))
    return True


def user_from_token(token: str) -> Optional[dict]:
    if not token:
        return None
    with tx() as c:
        row = c.execute(
            """SELECT u.* FROM users u
               JOIN auth_tokens t ON t.user_id = u.id
               WHERE t.token = ? AND t.expires_at > ?""",
            (token, now()),
        ).fetchone()
    return dict(row) if row else None


def _extract_token(authorization: Optional[str]) -> str:
    if not authorization:
        return ""
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return ""


def require_user(authorization: Optional[str] = Header(None)) -> dict:
    """FastAPI dependency — raises 401 if no valid token."""
    token = _extract_token(authorization)
    user = user_from_token(token)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user


def optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """FastAPI dependency — returns user or None."""
    token = _extract_token(authorization)
    return user_from_token(token)


def public_user(u: dict) -> dict:
    profile = None
    if u.get("profile_json"):
        try:
            profile = json.loads(u["profile_json"])
        except Exception:
            profile = None
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u.get("name") or "",
        "created_at": u["created_at"],
        "profile": profile,
    }

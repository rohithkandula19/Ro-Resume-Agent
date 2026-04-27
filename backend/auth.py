"""Auth: Firebase Admin token verification (replaces custom password / JWT layer)."""
from typing import Optional

import firebase_admin.auth as _fa
from fastapi import Header, HTTPException

from firebase_init import _init

_init()


def _extract_token(authorization: Optional[str]) -> str:
    if not authorization:
        return ""
    parts = authorization.split()
    return parts[1] if len(parts) == 2 and parts[0].lower() == "bearer" else ""


def user_from_token(token: str) -> Optional[dict]:
    if not token:
        return None
    try:
        return dict(_fa.verify_id_token(token))
    except Exception:
        return None


def require_user(authorization: Optional[str] = Header(None)) -> dict:
    """FastAPI dependency — raises 401 if no valid Firebase token."""
    user = user_from_token(_extract_token(authorization))
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user


def optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """FastAPI dependency — returns decoded token dict or None."""
    return user_from_token(_extract_token(authorization))


def public_user(u: dict, profile=None) -> dict:
    return {
        "id": u.get("uid", ""),
        "email": u.get("email", ""),
        "name": u.get("name", "") or u.get("display_name", ""),
        "created_at": int(u.get("iat", 0)),
        "profile": profile,
    }

"""In-memory token-bucket rate limiter scoped by user (or IP for unauthed).

Not durable — resets on process restart and each uvicorn worker has its own
buckets. If you deploy with `--workers N > 1`, a burst can effectively hit
N * capacity; swap to a Redis-backed bucket in that case. Single-process
uvicorn (the current setup) is unaffected."""

import threading
import time
from typing import Optional

from fastapi import HTTPException, Request, Header

import auth as _auth


class Bucket:
    __slots__ = ("capacity", "refill_per_sec", "tokens", "last", "lock")

    def __init__(self, capacity: float, refill_per_sec: float):
        self.capacity = capacity
        self.refill_per_sec = refill_per_sec
        self.tokens = capacity
        self.last = time.monotonic()
        self.lock = threading.Lock()

    def take(self, cost: float = 1.0) -> bool:
        with self.lock:
            now = time.monotonic()
            elapsed = now - self.last
            self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_per_sec)
            self.last = now
            if self.tokens >= cost:
                self.tokens -= cost
                return True
            return False


_buckets: dict[tuple[str, str], Bucket] = {}
_lock = threading.Lock()


def _key(scope: str, ident: str) -> tuple[str, str]:
    return (scope, ident)


def _get_bucket(scope: str, ident: str, capacity: float, refill: float) -> Bucket:
    k = _key(scope, ident)
    with _lock:
        b = _buckets.get(k)
        if b is None:
            b = Bucket(capacity, refill)
            _buckets[k] = b
    return b


# Defaults per scope (capacity, refill/sec). Expensive LLM routes get tighter limits.
LIMITS = {
    "llm_heavy": (10, 10 / 60.0),     # 10 calls then 1 per 6s (≈10/min)
    "llm_light": (30, 30 / 60.0),     # 30/min
    "build": (8, 8 / 60.0),           # 8/min — builds are multi-LLM
    "auth": (10, 10 / 60.0),          # anti-brute-force
    "crud_read": (120, 120 / 60.0),   # 2/sec — listings, lookups
    "crud_write": (60, 60 / 60.0),    # 1/sec — inserts, updates, deletes
    "default": (60, 60 / 60.0),       # 60/min
}


def _client_id(request: Request, authorization: Optional[str]) -> str:
    """Prefer user_id (from token) so one user can't bypass with multiple IPs.
    Falls back to client host + forwarded header for unauthed routes."""
    token = _auth._extract_token(authorization)
    user = _auth.user_from_token(token) if token else None
    if user:
        return f"u{user['id']}"
    fwd = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    host = fwd or (request.client.host if request.client else "unknown")
    return f"ip:{host}"


def limit(scope: str):
    """FastAPI dependency — raises 429 when the bucket is empty."""
    capacity, refill = LIMITS.get(scope, LIMITS["default"])

    def _dep(request: Request, authorization: Optional[str] = Header(None)):
        cid = _client_id(request, authorization)
        b = _get_bucket(scope, cid, capacity, refill)
        if not b.take(1.0):
            retry_after = max(1, int(1.0 / refill))
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded for {scope}. Try again in ~{retry_after}s.",
                headers={"Retry-After": str(retry_after)},
            )
        return True
    return _dep

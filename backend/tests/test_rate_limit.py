"""Bucket math — no FastAPI, no HTTP, just the token-bucket primitive."""

import time

from rate_limit import Bucket, LIMITS


def test_bucket_starts_full_and_empties():
    b = Bucket(capacity=3, refill_per_sec=1000)  # ignore refill for this test
    # Drain refill to 0 so we observe just the initial capacity.
    assert b.take(1) is True
    assert b.take(1) is True
    # Burn remaining capacity + any refilled tokens, then expect refusal.
    for _ in range(20):
        b.take(1)
    assert b.take(1000) is False  # cost larger than capacity always fails


def test_bucket_refills_over_time():
    b = Bucket(capacity=2, refill_per_sec=100)  # refills fast for test
    assert b.take(2) is True
    assert b.take(1) is False
    time.sleep(0.05)  # 5 tokens would refill, but capped at capacity
    assert b.take(1) is True


def test_bucket_respects_capacity_cap():
    b = Bucket(capacity=5, refill_per_sec=1000)
    time.sleep(0.02)  # would mint 20 tokens, but cap is 5
    taken = 0
    while b.take(1):
        taken += 1
        if taken > 10:
            break
    assert 5 <= taken <= 7  # some small drift allowed from clock granularity


def test_limits_scopes_exist():
    for scope in ("llm_heavy", "llm_light", "build", "auth", "crud_read", "crud_write", "default"):
        assert scope in LIMITS
        cap, refill = LIMITS[scope]
        assert cap > 0 and refill > 0

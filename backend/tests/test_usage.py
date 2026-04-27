"""Pricing table + cost math + recording to SQLite."""

import usage
import db as _db


def test_cost_known_model():
    # gpt-4o-mini is $0.15 / $0.60 per 1M tokens
    c = usage._cost("gpt-4o-mini", 1_000_000, 1_000_000)
    assert abs(c - (0.15 + 0.60)) < 1e-9


def test_cost_unknown_model_zero():
    assert usage._cost("totally-made-up-model-v7", 1_000_000, 1_000_000) == 0.0


def test_cost_prefix_fallback():
    # Unknown exact key but prefix "gpt-4o-mini" should still price.
    c = usage._cost("gpt-4o-mini-2024-07-18", 1_000_000, 0)
    assert abs(c - 0.15) < 1e-9


def test_cost_openrouter_claude():
    c = usage._cost("anthropic/claude-3.5-sonnet", 1_000_000, 1_000_000)
    assert abs(c - (3.00 + 15.00)) < 1e-9


def test_record_inserts_row():
    usage.set_context(user_id=None, endpoint="/api/test")
    usage.record("openai", "gpt-4o-mini", 100, 50)
    with _db.tx() as c:
        row = c.execute(
            "SELECT * FROM llm_usage WHERE endpoint=? ORDER BY id DESC LIMIT 1",
            ("/api/test",),
        ).fetchone()
    assert row is not None
    assert row["provider"] == "openai"
    assert row["prompt_tokens"] == 100
    assert row["completion_tokens"] == 50
    assert row["total_tokens"] == 150
    assert row["cost_usd"] > 0


def test_record_swallows_errors():
    # Passing None shouldn't blow up — record() is on the LLM hot path.
    usage.record("openai", "gpt-4o-mini", None, None)  # type: ignore[arg-type]

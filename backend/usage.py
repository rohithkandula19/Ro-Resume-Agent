"""LLM usage tracking. Records every successful chat() call with token counts.

Uses a contextvars.ContextVar so the request user_id + endpoint path flow down
to chat() without threading arguments through every call site. A FastAPI
middleware sets the context at request start; chat() reads it when recording.

Cost: for free models (Groq + OpenRouter free tier) this is $0, but token
counts are still recorded so we can see per-user/per-endpoint volume. Paid
providers (OpenAI, Anthropic) use the PRICING table below."""

import contextvars
import time

import db as _db


_ctx: contextvars.ContextVar[dict] = contextvars.ContextVar("ro_usage_ctx", default={})


# Prices per 1M tokens (USD, input / output). Free models (Groq, OpenRouter
# free tier) record $0 by default. Extend as new paid models are added.
PRICING: dict[str, tuple[float, float]] = {
    # OpenAI
    "gpt-4o-mini":   (0.15, 0.60),
    "gpt-4o":        (2.50, 10.00),
    "gpt-4-turbo":   (10.00, 30.00),
    "gpt-4":         (30.00, 60.00),
    "gpt-3.5-turbo": (0.50, 1.50),
    "o1":            (15.00, 60.00),
    "o1-mini":       (3.00, 12.00),
    "o3-mini":       (1.10, 4.40),
    # Anthropic
    "claude-3-5-haiku-latest":    (0.80, 4.00),
    "claude-3-5-haiku-20241022":  (0.80, 4.00),
    "claude-3-5-sonnet-latest":   (3.00, 15.00),
    "claude-3-5-sonnet-20241022": (3.00, 15.00),
    "claude-3-5-sonnet-20240620": (3.00, 15.00),
    "claude-3-7-sonnet-latest":   (3.00, 15.00),
    "claude-3-opus-latest":       (15.00, 75.00),
    "claude-3-haiku-20240307":    (0.25, 1.25),
    # Groq — free/low-cost tier, token counts still logged
    "llama-3.3-70b-versatile":        (0.0, 0.0),
    "llama-3.1-70b-versatile":        (0.0, 0.0),
    "llama-3.1-8b-instant":           (0.0, 0.0),
    "llama3-70b-8192":                (0.0, 0.0),
    "llama3-8b-8192":                 (0.0, 0.0),
    "mixtral-8x7b-32768":             (0.0, 0.0),
    "gemma2-9b-it":                   (0.0, 0.0),
    # OpenRouter — common paid routes
    "anthropic/claude-3.5-sonnet":    (3.00, 15.00),
    "anthropic/claude-3.5-haiku":     (0.80, 4.00),
    "openai/gpt-4o":                  (2.50, 10.00),
    "openai/gpt-4o-mini":             (0.15, 0.60),
    "meta-llama/llama-3.1-70b-instruct": (0.52, 0.75),
    "meta-llama/llama-3.1-8b-instruct":  (0.06, 0.06),
    "google/gemini-pro-1.5":          (1.25, 5.00),
    "google/gemini-flash-1.5":        (0.075, 0.30),
    "mistralai/mistral-large":        (2.00, 6.00),
    "qwen/qwen-2.5-72b-instruct":     (0.35, 0.40),
    "deepseek/deepseek-chat":         (0.14, 0.28),
}

# Fallback prefix → (input, output) $/1M. Matched when exact key miss.
_PRICING_PREFIX: list[tuple[str, tuple[float, float]]] = [
    ("gpt-4o-mini",                    (0.15, 0.60)),
    ("gpt-4o",                         (2.50, 10.00)),
    ("gpt-4-turbo",                    (10.00, 30.00)),
    ("gpt-4",                          (30.00, 60.00)),
    ("gpt-3.5",                        (0.50, 1.50)),
    ("claude-3-5-haiku",               (0.80, 4.00)),
    ("claude-3-5-sonnet",              (3.00, 15.00)),
    ("claude-3-7-sonnet",              (3.00, 15.00)),
    ("claude-3-opus",                  (15.00, 75.00)),
    ("claude-3-haiku",                 (0.25, 1.25)),
    ("anthropic/claude-3.5-sonnet",    (3.00, 15.00)),
    ("anthropic/claude-3.5-haiku",     (0.80, 4.00)),
]


def set_context(user_id: int | None, endpoint: str) -> None:
    _ctx.set({"user_id": user_id, "endpoint": endpoint})


def _cost(model: str, prompt: int, completion: int) -> float:
    p = PRICING.get(model)
    if not p:
        m = (model or "").lower()
        for prefix, price in _PRICING_PREFIX:
            if m.startswith(prefix):
                p = price
                break
    if not p:
        return 0.0
    in_cost, out_cost = p
    return (prompt / 1_000_000) * in_cost + (completion / 1_000_000) * out_cost


def record(provider: str, model: str, prompt_tokens: int,
           completion_tokens: int) -> None:
    """Insert one usage row. Swallows all errors — never break the LLM call path."""
    try:
        ctx = _ctx.get() or {}
        total = (prompt_tokens or 0) + (completion_tokens or 0)
        cost = _cost(model, prompt_tokens or 0, completion_tokens or 0)
        with _db.tx() as c:
            c.execute(
                """INSERT INTO llm_usage
                   (user_id, endpoint, provider, model, prompt_tokens,
                    completion_tokens, total_tokens, cost_usd, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (ctx.get("user_id"), ctx.get("endpoint", ""), provider, model,
                 prompt_tokens or 0, completion_tokens or 0, total, cost,
                 int(time.time())),
            )
    except Exception:
        pass


def record_from_response(provider: str, model: str, resp) -> None:
    """Extract token counts from an OpenAI-style response object."""
    try:
        u = getattr(resp, "usage", None)
        if u is None:
            return
        record(provider, model,
               int(getattr(u, "prompt_tokens", 0) or 0),
               int(getattr(u, "completion_tokens", 0) or 0))
    except Exception:
        pass

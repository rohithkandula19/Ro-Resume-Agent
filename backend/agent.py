"""LLM orchestrator — Groq (primary, fast) → OpenRouter free (fallback)."""

import os
import time

import requests
from dotenv import load_dotenv
from openai import OpenAI

from prompts import CONSULTANT_SYSTEM, REWRITER_SYSTEM
import usage as _usage

load_dotenv()


# ---------- Groq client ----------

GROQ_MODELS = [
    # Verified working on Groq — ordered by latency
    "llama-3.1-8b-instant",       # fastest — sub-300ms
    "llama-3.3-70b-versatile",    # great quality, ~400ms
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "gemma2-9b-it",
    "llama3-8b-8192",
]


def get_groq_client() -> OpenAI | None:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    return OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=api_key,
        timeout=30.0,
        max_retries=0,
    )


# ---------- OpenAI direct (Tier 2 fallback when Groq fails) ----------

OPENAI_MODELS = [
    "gpt-4o-mini",   # fast + cheap
    "gpt-4o",        # higher quality when mini fails
]


def get_openai_client() -> OpenAI | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAI(api_key=api_key, timeout=30.0, max_retries=0)


# ---------- Anthropic direct (Tier 2 alt) ----------

def get_anthropic_client():
    """Optional: Anthropic fallback. Returns client + models or None."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        import anthropic
        return anthropic.Anthropic(api_key=api_key, timeout=30.0, max_retries=0)
    except ImportError:
        return None


ANTHROPIC_MODELS = [
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-6",
]


def _anthropic_chat(client, model: str, messages: list[dict], temperature: float, max_tokens: int | None) -> str:
    """Call Anthropic messages API, translating system + alternating user/assistant."""
    system_parts = [m["content"] for m in messages if m["role"] == "system"]
    chat_msgs = [{"role": m["role"], "content": m["content"]} for m in messages if m["role"] != "system"]
    resp = client.messages.create(
        model=model,
        system="\n\n".join(system_parts) if system_parts else None,
        messages=chat_msgs,
        temperature=temperature,
        max_tokens=max_tokens or 1024,
    )
    if not resp.content:
        return ""
    text = "".join(block.text for block in resp.content if getattr(block, "type", "") == "text")
    if text.strip():
        try:
            u = getattr(resp, "usage", None)
            if u is not None:
                _usage.record("anthropic", model,
                              int(getattr(u, "input_tokens", 0) or 0),
                              int(getattr(u, "output_tokens", 0) or 0))
        except Exception:
            pass
    return text


# ---------- OpenRouter free-model fallback ----------

_MODEL_CACHE: dict = {"at": 0, "models": []}
_MODEL_TTL = 3600


def _is_free(model: dict) -> bool:
    p = model.get("pricing") or {}
    try:
        return float(p.get("prompt", 1)) == 0 and float(p.get("completion", 1)) == 0
    except (TypeError, ValueError):
        return False


def fetch_free_models(force: bool = False) -> list[str]:
    if not force and _MODEL_CACHE["models"] and time.time() - _MODEL_CACHE["at"] < _MODEL_TTL:
        return _MODEL_CACHE["models"]
    try:
        r = requests.get("https://openrouter.ai/api/v1/models", timeout=10)
        r.raise_for_status()
        free = [m["id"] for m in r.json().get("data", []) if _is_free(m)]
        _MODEL_CACHE["at"] = time.time()
        _MODEL_CACHE["models"] = free
        return free
    except Exception:
        return _MODEL_CACHE.get("models") or []


OPENROUTER_POOL = [
    "meta-llama/llama-4-maverick:free",
    "meta-llama/llama-4-scout:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-3-27b-it:free",
    "google/gemma-3-12b-it:free",
    "qwen/qwen3-14b:free",
    "qwen/qwen3-30b-a3b:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "deepseek/deepseek-chat-v3-0324:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-72b-instruct:free",
    "deepseek/deepseek-r1:free",
]


def get_client() -> OpenAI:
    """Returns OpenRouter client (used as fallback internally)."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY missing.")
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
        timeout=60.0,
        max_retries=0,
        default_headers={
            "HTTP-Referer": "https://ro-resume-agent.local",
            "X-Title": "RO Resume Agent",
        },
    )


def model_primary() -> str:
    return os.getenv("OPENROUTER_PRIMARY_MODEL") or OPENROUTER_POOL[0]


def model_alt() -> str:
    return os.getenv("OPENROUTER_ALT_MODEL") or OPENROUTER_POOL[1]


def model_fallback() -> str:
    return os.getenv("OPENROUTER_FALLBACK_MODEL") or OPENROUTER_POOL[2]


def model_fast() -> str:
    return os.getenv("OPENROUTER_FAST_MODEL") or OPENROUTER_POOL[3]


# kept for backwards compat
FREE_MODEL_POOL = OPENROUTER_POOL


def _openrouter_pool() -> list[str]:
    live = set(fetch_free_models())
    out = [m for m in OPENROUTER_POOL if m in live]
    for m in fetch_free_models():
        if m not in out:
            out.append(m)
    return out or OPENROUTER_POOL


def model_pool() -> list[str]:
    """Return ordered list of all available models (OpenRouter first, Groq appended)."""
    pool = _openrouter_pool()
    for m in GROQ_MODELS:
        pool.append(m)
    return pool


# ---------- Unified chat — Groq first, OpenRouter fallback ----------

def chat(
    client: OpenAI,          # OpenRouter client (primary)
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.4,
    max_tokens: int | None = None,
) -> str:
    """Tier 1: Groq → Tier 2: OpenAI direct / Anthropic direct → Tier 3: OpenRouter free."""
    last_err: Exception | None = None

    # 1. Groq (primary — sub-second latency)
    groq = get_groq_client()
    if groq:
        for m in GROQ_MODELS:
            try:
                resp = groq.chat.completions.create(
                    model=m, messages=messages,
                    temperature=temperature, max_tokens=max_tokens,
                )
                content = resp.choices[0].message.content or ""
                if content.strip():
                    _usage.record_from_response("groq", m, resp)
                    return content
            except Exception as e:
                last_err = e
                continue

    # 2a. OpenAI direct (paid, reliable — only engaged if key is set)
    openai_client = get_openai_client()
    if openai_client:
        for m in OPENAI_MODELS:
            try:
                resp = openai_client.chat.completions.create(
                    model=m, messages=messages,
                    temperature=temperature, max_tokens=max_tokens,
                )
                content = resp.choices[0].message.content or ""
                if content.strip():
                    _usage.record_from_response("openai", m, resp)
                    return content
            except Exception as e:
                last_err = e
                continue

    # 2b. Anthropic direct (paid alt — engaged if ANTHROPIC_API_KEY is set)
    anth = get_anthropic_client()
    if anth:
        for m in ANTHROPIC_MODELS:
            try:
                content = _anthropic_chat(anth, m, messages, temperature, max_tokens)
                if content and content.strip():
                    return content
            except Exception as e:
                last_err = e
                continue

    # 3. OpenRouter free models (fallback)
    seen: set[str] = set()
    candidates: list[str] = []
    if model:
        candidates.append(model); seen.add(model)
    for m in _openrouter_pool():
        if m not in seen:
            candidates.append(m); seen.add(m)

    for m in candidates:
        try:
            resp = client.chat.completions.create(
                model=m, messages=messages,
                temperature=temperature, max_tokens=max_tokens,
            )
            content = resp.choices[0].message.content or ""
            if content.strip():
                _usage.record_from_response("openrouter", m, resp)
                return content
        except Exception as e:
            last_err = e
            continue

    raise RuntimeError(f"All models failed. Last error: {last_err}")


def consultant_chat(client: OpenAI, history: list[dict], user_message: str) -> str:
    msgs = [{"role": "system", "content": CONSULTANT_SYSTEM}]
    msgs.extend(history)
    msgs.append({"role": "user", "content": user_message})
    return chat(client, msgs, temperature=0.5)


def rewrite_section(client: OpenAI, section_name: str, current_text: str,
                     jd_context: str, user_profile: str) -> str:
    user = (
        f"Section: {section_name}\n\n"
        f"User profile:\n{user_profile}\n\n"
        f"Target JD context:\n{jd_context}\n\n"
        f"Current content:\n{current_text}\n\n"
        f"Rewrite this section per the rules."
    )
    return chat(
        client,
        [{"role": "system", "content": REWRITER_SYSTEM}, {"role": "user", "content": user}],
        temperature=0.4,
    )


def generate_full_resume_json(client: OpenAI, profile_text: str, jd_text: str,
                               template_name: str, font_name: str,
                               tailor: bool = True,
                               must_include_keywords: list[str] | None = None) -> str:
    """
    tailor=True (default): aggressively rewrite against the JD.
    tailor=False: produce a clean, structured resume from the profile ONLY,
                  ignoring the JD entirely. Used for the 'original' baseline
                  the frontend diffs against.
    """
    has_jd = bool(jd_text and tailor)

    if has_jd:
        system = (
            "You produce a FINAL RESUME JSON aggressively tailored to the target job description. "
            "Your job is to maximize the user's interview odds at this specific role. "
            "Schema: {name, contact, summary, skills:[string], "
            "experience:[{title,org,dates,bullets:[string]}], "
            "projects:[{title,org,dates,bullets:[string]}], "
            "education:[{degree,school,dates,notes}], certifications:[string]}. "
            "\n\nTAILORING RULES (strict — this is the whole point):\n"
            "- SUMMARY: write a fresh 2-3 sentence summary that mirrors the JD's role title, seniority,\n"
            "  domain, and top 3 required skills. Open with the JD's exact role phrase when reasonable.\n"
            "- BULLETS: rewrite every single bullet using the JD's vocabulary and framing. If the JD\n"
            "  says 'distributed systems', do not say 'microservices' — say 'distributed systems'.\n"
            "  Lead with an impact verb, then what was built/done, then the measurable outcome.\n"
            "  Preserve every factual claim from the profile (companies, tools actually used, real\n"
            "  numbers) — never invent experience, but reframe the same truth in JD-aligned language.\n"
            "- SKILLS: reorder so skills the JD explicitly asks for appear FIRST. Drop skills unrelated\n"
            "  to this JD (keep only if they strengthen the match). Add a skill only if it is clearly\n"
            "  demonstrated in the profile text — do NOT add skills the user does not actually have.\n"
            "- KEYWORDS: every required keyword from the JD that the user legitimately has must appear\n"
            "  somewhere (summary, skills, or bullets) so ATS parsers catch it.\n"
            "- NUMBERS: use concrete metrics ONLY when present in the profile. Never fabricate.\n"
            "- NEVER emit placeholders: no [X%], [N], [number], [...], TBD, XX. If no real metric\n"
            "  exists, describe the outcome qualitatively.\n"
            "- UNIQUENESS: every bullet must be unique to its role. Never duplicate across jobs.\n"
            "\nSKILLS FORMAT RULE:\n"
            "- Flat list of individual skill strings. No category prefixes like 'CLOUD GCP' or\n"
            "  'DATABASES MySQL'. Each list element is exactly one skill.\n"
            "\nOUTPUT: JSON only. No prose, no markdown fences, no commentary."
        )
        must_block = ""
        if must_include_keywords:
            kws = ", ".join(str(k) for k in must_include_keywords if k)
            if kws:
                must_block = (
                    f"\n\nMUST-INCLUDE KEYWORDS (the user confirmed they have these — weave them "
                    f"into skills, bullets, or summary where they honestly fit their actual work; "
                    f"each must appear at least once somewhere in the output):\n{kws}"
                )
        user = (
            f"Target template: {template_name}\n"
            f"Preferred font: {font_name}\n\n"
            f"USER PROFILE (from uploaded resume + answers) — factual source of truth:\n"
            f"---\n{profile_text}\n---\n\n"
            f"TARGET JOB DESCRIPTION — rewrite everything to align with this:\n"
            f"---\n{jd_text}\n---"
            f"{must_block}"
        )
    else:
        system = (
            "You produce a clean, structured resume JSON from the user's profile text. "
            "Do NOT tailor to any specific job. Faithfully preserve the user's existing experience, "
            "bullets, companies, dates, and skills exactly as described in the profile. This is the "
            "BASELINE (original) view the user wants to see before any JD rewriting. "
            "Schema: {name, contact, summary, skills:[string], "
            "experience:[{title,org,dates,bullets:[string]}], "
            "projects:[{title,org,dates,bullets:[string]}], "
            "education:[{degree,school,dates,notes}], certifications:[string]}. "
            "\n\nRULES:\n"
            "- Preserve the user's original bullet wording as much as possible. Clean up obvious\n"
            "  typos and formatting artifacts only — do NOT rewrite, rephrase, or add keywords.\n"
            "- Never invent experience, companies, dates, or metrics.\n"
            "- No placeholders ([X%], [N], TBD, XX) — if a metric is missing, describe qualitatively.\n"
            "- Skills: flat list of strings, no category prefixes.\n"
            "\nOUTPUT: JSON only. No prose, no markdown fences."
        )
        user = (
            f"Target template: {template_name}\n"
            f"Preferred font: {font_name}\n\n"
            f"USER PROFILE:\n---\n{profile_text}\n---"
        )

    return chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.3,
        max_tokens=3000,
    )

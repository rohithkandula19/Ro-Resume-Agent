"""Battle Mode — generate 3 resume variants and score each against the JD."""

import json
import re

from agent import chat, model_primary, model_alt, model_fallback


VARIANT_STYLES = {
    "minimal":  "Ultra-clean, minimal language. Google XYZ style bullets. Zero fluff. Tight one-page density.",
    "balanced": "Professional and polished. Strong narrative summary + quantified bullets. One to two pages.",
    "bold":     "High-impact language, leadership signals, scope emphasized. Scale language (millions, billions). Senior tone.",
}


RESUME_JSON_SCHEMA = (
    "Return VALID JSON only. Schema: "
    "{name, contact, summary, skills:[string], "
    "experience:[{title, org, dates, bullets:[string]}], "
    "projects:[{title, org, dates, bullets:[string]}], "
    "education:[{degree, school, dates, notes}], certifications:[string]}"
)


def _strip_fences(s: str) -> str:
    s = (s or "").strip()
    s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s, flags=re.MULTILINE)
    return s


def _parse_json(raw: str) -> dict:
    try:
        return json.loads(_strip_fences(raw))
    except Exception:
        m = re.search(r"\{.*\}", raw or "", re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                return {}
    return {}


def build_variant(client, profile_text: str, jd_text: str, variant_key: str) -> dict:
    style = VARIANT_STYLES.get(variant_key, VARIANT_STYLES["balanced"])
    system = (
        "You produce a tailored resume. " + RESUME_JSON_SCHEMA + " "
        "Follow bullet rules: strong verb, what was done, tools when relevant, "
        "measurable impact. Integrate JD keywords naturally — no stuffing. "
        "Use [X%] or [N] placeholders for unknown metrics — NEVER fabricate. "
        "No prose, no markdown fences, JSON only."
    )
    user = (
        f"VARIANT STYLE: {style}\n\n"
        f"USER PROFILE:\n{profile_text}\n\n"
        f"TARGET JD:\n{jd_text or '(none)'}"
    )
    # Use different models per variant to diversify
    model_map = {
        "minimal": model_primary(),
        "balanced": model_alt(),
        "bold": model_fallback(),
    }
    raw = chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=model_map.get(variant_key, model_primary()),
        temperature=0.45,
        max_tokens=2800,
    )
    return _parse_json(raw)


def score_variant(client, resume: dict, jd_text: str) -> dict:
    """Score a resume against a JD on multiple axes."""
    system = (
        "You score a resume against a JD. Return VALID JSON only with keys: "
        "{ats_match_percent:int, keyword_coverage:int, impact_score:int, "
        "clarity_score:int, recruiter_scan_score:int, overall:int, "
        "strengths:[string], weaknesses:[string]}. "
        "All scores are 0-100 integers. No prose."
    )
    user = f"RESUME JSON:\n{json.dumps(resume)}\n\nJD:\n{jd_text or '(none)'}"
    raw = chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        temperature=0.2,
        max_tokens=600,
    )
    return _parse_json(raw)


def battle(client, profile_text: str, jd_text: str) -> dict:
    """Generate 3 variants, score each, return all with a recommended winner."""
    variants = {}
    for key in ("minimal", "balanced", "bold"):
        resume = build_variant(client, profile_text, jd_text, key)
        score = score_variant(client, resume, jd_text) if resume else {}
        variants[key] = {"resume": resume, "score": score}

    # Pick winner by overall score
    def _overall(v):
        s = v.get("score") or {}
        return s.get("overall", s.get("ats_match_percent", 0))

    winner = max(variants, key=lambda k: _overall(variants[k]))
    return {"variants": variants, "winner": winner}

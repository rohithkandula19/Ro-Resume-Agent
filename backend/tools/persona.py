"""Recruiter persona review — evaluate resume through a specific recruiter's lens."""

import json
import re

from agent import chat, model_primary
from library.personas import get_persona


def _parse_json(raw: str) -> dict:
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", (raw or "").strip(), flags=re.MULTILINE)
    try:
        return json.loads(raw)
    except Exception:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                return {}
    return {}


def persona_review(client, resume_text: str, persona_key: str, jd_text: str = "") -> dict:
    persona = get_persona(persona_key)
    system = (
        f"You are a {persona['name']}. Your lens: {persona['lens']} "
        f"You look for: {persona['looks_for']}. "
        f"Your red flags: {persona['red_flags']}. "
        f"Tone of critique: {persona['tone']}. "
        "Review the resume. Return VALID JSON only: "
        "{verdict:string, score:int(0-100), "
        "strengths:[string], weaknesses:[string], "
        "rewrites:[{original:string, suggested:string, why:string}], "
        "would_interview:boolean}. "
        "Be honest, specific, actionable. No prose outside JSON."
    )
    user = f"RESUME:\n{resume_text}\n\nJD (optional):\n{jd_text or '(none)'}"
    raw = chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=model_primary(),
        temperature=0.4,
        max_tokens=2000,
    )
    out = _parse_json(raw)
    out["persona_key"] = persona_key
    out["persona_name"] = persona["name"]
    return out

"""Role-fit radar — score the user 0-10 on each axis for their target role."""

import json
import re

from agent import chat, model_primary
from library.role_axes import axes_for_role


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


def score_role_fit(client, resume_text: str, role: str, jd_text: str = "") -> dict:
    axes = axes_for_role(role)
    system = (
        "You score a candidate against role-specific skill axes. "
        "Return VALID JSON only with keys: "
        "{axes:[{name:string, score:int(0-10), evidence:string, gap:string}], "
        "overall_fit:int(0-100), top_strengths:[string], top_gaps:[string]}. "
        "score: 0 no evidence, 10 world-class. "
        "evidence: short quote or summary from the resume. "
        "gap: concrete improvement suggestion if score < 8. "
        "No prose outside JSON."
    )
    user = (
        f"ROLE: {role}\nAXES: {axes}\n\n"
        f"RESUME:\n{resume_text}\n\n"
        f"JD (optional):\n{jd_text or '(none)'}"
    )
    raw = chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=model_primary(),
        temperature=0.3,
        max_tokens=1500,
    )
    parsed = _parse_json(raw)
    parsed["role"] = role
    parsed["role_axes"] = axes
    return parsed

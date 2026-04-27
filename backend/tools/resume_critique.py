"""Resume critique — structured LLM review of summary, skills, bullets, ATS."""

import json
import re

from agent import chat, model_primary


CRITIQUE_SYSTEM = """You are a senior resume coach and ATS specialist. Given a resume
(and optionally a target role), return ONLY valid JSON with this exact schema:

{
  "overall_score": <int 0-100>,
  "verdict": "<one-sentence headline>",
  "issues": [
    {
      "section": "summary" | "skills" | "experience" | "projects" | "education" | "ats" | "structure",
      "severity": "high" | "medium" | "low",
      "issue": "<what is wrong, 1 sentence>",
      "fix": "<concrete rewrite or action, 1-2 sentences>",
      "example": "<optional improved snippet, or empty string>"
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>", ...]
}

Rules:
- 6-12 issues total, prioritized by impact.
- Quote weak phrases verbatim in "issue" when possible.
- "fix" must be actionable (not "make it better").
- If a target role is given, check alignment of skills and keywords.
- No markdown, no prose outside the JSON.
"""


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


def critique(client, resume_text: str, target_role: str = "", jd_text: str = "") -> dict:
    if not (resume_text or "").strip():
        return {"overall_score": 0, "verdict": "No resume text provided.",
                "issues": [], "strengths": []}

    user = f"RESUME:\n{resume_text.strip()[:8000]}"
    if target_role:
        user += f"\n\nTARGET ROLE: {target_role}"
    if jd_text:
        user += f"\n\nJD (optional context):\n{jd_text.strip()[:3000]}"

    msgs = [
        {"role": "system", "content": CRITIQUE_SYSTEM},
        {"role": "user", "content": user},
    ]
    raw = chat(client, msgs, model=model_primary(), temperature=0.3, max_tokens=1800)
    data = _parse_json(raw)

    # Minimal sanitation
    data.setdefault("overall_score", 0)
    data.setdefault("verdict", "")
    data.setdefault("issues", [])
    data.setdefault("strengths", [])
    try:
        data["overall_score"] = max(0, min(100, int(data["overall_score"])))
    except Exception:
        data["overall_score"] = 0
    return data

"""AI-extract structured profile summary from resume text."""

import json
import re

from agent import chat, model_primary

SYSTEM = """Extract a structured profile from a resume. Return ONLY valid JSON matching this schema:
{
  "years_experience": number (0 if unclear),
  "current_title": string,
  "target_roles": [string],  // likely roles this person fits
  "top_skills": [string],    // up to 8, ordered by prominence
  "domains": [string],       // e.g. fintech, healthcare, e-commerce (up to 3)
  "seniority": "junior" | "mid" | "senior" | "staff" | "principal" | "executive",
  "headline": string         // one sentence, 15-20 words
}
No prose, no markdown fences. Just the JSON object."""


def _fallback(resume_text: str) -> dict:
    """Regex-based rough extraction when LLM is unavailable."""
    years = 0
    m = re.search(r"(\d+)\+?\s*years?", resume_text, re.I)
    if m:
        try:
            years = int(m.group(1))
        except Exception:
            years = 0
    first_line = next((l.strip() for l in resume_text.splitlines() if l.strip()), "")
    return {
        "years_experience": years,
        "current_title": first_line[:60],
        "target_roles": [],
        "top_skills": [],
        "domains": [],
        "seniority": "mid",
        "headline": first_line[:120],
    }


def extract_profile(client, resume_text: str) -> dict:
    text = (resume_text or "").strip()
    if not text:
        return _fallback(text)
    try:
        msgs = [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": text[:6000]},
        ]
        reply = chat(client, msgs, model=model_primary(), temperature=0.2, max_tokens=600)
        start = reply.find("{")
        end = reply.rfind("}")
        if start == -1 or end == -1:
            return _fallback(text)
        data = json.loads(reply[start : end + 1])
        data.setdefault("years_experience", 0)
        data.setdefault("current_title", "")
        data.setdefault("target_roles", [])
        data.setdefault("top_skills", [])
        data.setdefault("domains", [])
        data.setdefault("seniority", "mid")
        data.setdefault("headline", "")
        try:
            data["years_experience"] = int(data["years_experience"])
        except Exception:
            data["years_experience"] = 0
        return data
    except Exception:
        return _fallback(text)

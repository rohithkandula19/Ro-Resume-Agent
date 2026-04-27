"""6-Second Scan Simulator — generate recruiter eye-path data for a resume."""

import json
import re

from agent import chat, model_primary


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


def scan_path(client, resume: dict) -> dict:
    """Simulate where a recruiter's eye lands in the first 6 seconds."""
    system = (
        "You simulate a recruiter's 6-second F-pattern scan of a resume. "
        "Return VALID JSON only: "
        "{fixations:[{zone:string, dwell_ms:int, takeaway:string, sentiment:string}], "
        "first_impression:string, decision:string, recommendations:[string]}. "
        "Zones: 'name_header', 'summary', 'top_job_title', 'top_job_bullet_1', "
        "'top_job_bullet_2', 'skills', 'education', 'projects'. "
        "dwell_ms: 200-1800. sentiment: 'positive' | 'neutral' | 'negative'. "
        "decision: 'advance' | 'maybe' | 'reject'. "
        "Total dwell should be ~6000ms. Be honest."
    )
    user = f"RESUME JSON:\n{json.dumps(resume)}"
    raw = chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=model_primary(),
        temperature=0.35,
        max_tokens=1200,
    )
    return _parse_json(raw)

"""Resume Assist — take free-form user instruction + current resume text,
return updated resume text with a short summary of what changed."""

import json
import re

from agent import chat, model_primary


ASSIST_SYSTEM = """You are an expert resume editor. The user will give you their
current resume as plain text plus a short instruction (e.g. "add a project about X",
"rewrite the summary for a senior SWE role", "tighten the experience bullets",
"add Python and AWS to skills").

Rules:
- Preserve the resume's existing structure, section headings, and order unless the
  instruction explicitly asks to reorganize.
- Do not invent facts about the user (company names, dates, metrics) that were not
  provided in either the resume or the instruction. If metrics are missing, use
  realistic placeholders like "[metric]" so the user knows to fill them in.
- Keep bullets action-verb led, quantified when possible, one line each.
- No markdown bold/italic. No em-dashes.

Return ONLY valid JSON with this schema:
{
  "updated_resume": "<full updated resume as plain text>",
  "summary": "<one or two sentences describing what you changed>",
  "added_section": "<section name if you created a new section, else empty string>"
}
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


def assist(client, resume_text: str, instruction: str) -> dict:
    resume_text = (resume_text or "").strip()
    instruction = (instruction or "").strip()
    if not resume_text:
        return {"updated_resume": "", "summary": "No resume text provided.", "added_section": ""}
    if not instruction:
        return {"updated_resume": resume_text, "summary": "No instruction provided.", "added_section": ""}

    user = f"CURRENT RESUME:\n{resume_text[:8000]}\n\nINSTRUCTION:\n{instruction[:800]}"
    msgs = [
        {"role": "system", "content": ASSIST_SYSTEM},
        {"role": "user", "content": user},
    ]
    raw = chat(client, msgs, model=model_primary(), temperature=0.4, max_tokens=2400)
    data = _parse_json(raw)

    data.setdefault("updated_resume", resume_text)
    data.setdefault("summary", "")
    data.setdefault("added_section", "")
    # LLM sometimes returns updated_resume as a dict {paragraph1: ..., paragraph2: ...}
    # instead of plain text. Flatten it so the frontend always gets a string.
    ur = data["updated_resume"]
    if isinstance(ur, dict):
        data["updated_resume"] = "\n\n".join(str(v) for v in ur.values() if v)
    elif not isinstance(ur, str) or not str(ur).strip():
        data["updated_resume"] = resume_text
    if not data["updated_resume"].strip():
        data["updated_resume"] = resume_text
    if not isinstance(data["summary"], str):
        data["summary"] = str(data["summary"]) if data["summary"] else ""
    return data

"""Interview prep: generate likely questions, STAR stories, weak spots."""

import json

from agent import chat, model_primary

SYSTEM = """You prepare a candidate for a real interview. Use their resume and the JD to
generate questions they will actually be asked — not generic ones. Return ONLY valid JSON.

Schema:
{
  "behavioral": [
    {"q": string, "why_asked": string, "angle": string}  // 5 entries, STAR-format friendly
  ],
  "technical": [
    {"q": string, "why_asked": string, "angle": string}  // 5 entries, role-specific
  ],
  "resume_digs": [
    {"q": string, "why_asked": string, "angle": string}  // 3 entries — things an interviewer WILL probe: job hops, gaps, vague bullets, big claims without numbers
  ],
  "star_stories": [
    {"prompt": string, "situation": string, "task": string, "action": string, "result": string}  // 3 entries, grounded in the actual resume bullets
  ],
  "weak_spots": [
    {"issue": string, "how_to_address": string}  // 3 entries: things the resume exposes that a sharp interviewer will poke at
  ],
  "questions_to_ask": [string]  // 5 sharp questions the candidate should ask back
}

Rules:
- "why_asked" is 1 sentence on what the interviewer is really probing.
- "angle" is 1 sentence of concrete coaching — what to emphasize, what to avoid.
- STAR stories MUST be grounded in bullets from the actual resume. If a number isn't in the resume, do not invent one.
- resume_digs should name the specific bullet or gap (quote 5-10 words from it).
- No markdown, no prose outside the JSON."""


def _fallback() -> dict:
    return {
        "behavioral": [],
        "technical": [],
        "resume_digs": [],
        "star_stories": [],
        "weak_spots": [],
        "questions_to_ask": [],
        "error": "LLM did not return parseable interview prep — try again or check API key.",
    }


def prepare_interview(client, resume_text: str, jd_text: str = "", role: str = "") -> dict:
    resume = (resume_text or "").strip()
    if len(resume) < 50:
        return {**_fallback(), "error": "Upload a resume first."}

    user_block = (
        f"TARGET ROLE: {role or 'unspecified'}\n\n"
        f"JOB DESCRIPTION:\n{(jd_text or '(not provided)')[:3500]}\n\n"
        f"RESUME:\n{resume[:5500]}"
    )

    try:
        reply = chat(
            client,
            [{"role": "system", "content": SYSTEM},
             {"role": "user", "content": user_block}],
            model=model_primary(),
            temperature=0.4,
            max_tokens=2200,
        )
        start = reply.find("{")
        end = reply.rfind("}")
        if start == -1 or end == -1:
            return _fallback()
        data = json.loads(reply[start : end + 1])
        for key in ("behavioral", "technical", "resume_digs", "star_stories", "weak_spots", "questions_to_ask"):
            data.setdefault(key, [])
        return data
    except Exception as e:
        return {**_fallback(), "error": str(e)[:200]}

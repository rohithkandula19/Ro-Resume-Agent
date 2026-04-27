"""Mock interview — conversational interviewer that takes a turn at a time.

Stateless by design: the frontend passes the full message history each turn.
Two modes:
  - turn: next interviewer question, given history + stage
  - feedback: structured critique of a user's answer to a question
"""

import json
import re

from agent import chat, model_primary


_INTERVIEWER_SYS = (
    "You are a sharp, realistic technical interviewer. "
    "You ask ONE question at a time, keep it conversational, and probe follow-ups "
    "when answers are thin. You never break character. You never give feedback "
    "mid-interview — only the next question. Keep each question under 2 sentences.\n\n"
    "Stages (you move through these in order, spending 1-2 questions per stage):\n"
    "  1) warmup (icebreaker, tell me about yourself)\n"
    "  2) behavioral (past experience, conflict, leadership, failure)\n"
    "  3) technical (role-relevant technical depth)\n"
    "  4) resume_dig (probe something specific from their resume)\n"
    "  5) jd_match (why this role, why this company)\n"
    "  6) reverse (invite the candidate to ask you questions)\n"
    "  7) done (close the interview)\n\n"
    "Output ONLY the interviewer's next line. No stage labels, no meta commentary."
)


_FEEDBACK_SYS = (
    "You are an interview coach reviewing ONE answer to ONE interview question. "
    "Return STRICT JSON with this shape:\n"
    "{\n"
    '  "score": 1-5,\n'
    '  "strengths": ["..."],\n'
    '  "weaknesses": ["..."],\n'
    '  "star_check": {"situation": bool, "task": bool, "action": bool, "result": bool},\n'
    '  "stronger_version": "a rewritten 2-3 sentence answer the candidate could have given",\n'
    '  "followup_the_interviewer_will_ask": "the most likely follow-up probe"\n'
    "}\n"
    "Score rubric: 5=standout with concrete metrics, 4=solid, 3=acceptable but generic, "
    "2=weak/vague, 1=off-topic or no real answer. Be direct — don't sugarcoat."
)


def _strip_fences(s: str) -> str:
    return re.sub(r"^```(?:json)?\s*|\s*```$", "", s.strip(), flags=re.MULTILINE)


def next_question(client, resume_text: str, jd_text: str, role: str,
                  history: list, stage: str = "warmup") -> dict:
    """Return the interviewer's next line.
    history: [{role: "interviewer"|"candidate", content: str}, ...]
    """
    ctx_lines = []
    if role:
        ctx_lines.append(f"Target role: {role}")
    if jd_text:
        ctx_lines.append(f"Job description (truncated):\n{jd_text[:1200]}")
    if resume_text:
        ctx_lines.append(f"Candidate resume (truncated):\n{resume_text[:2500]}")
    ctx_lines.append(f"Current stage: {stage}")
    ctx = "\n\n".join(ctx_lines)

    # Convert interview history into a compact transcript the model can continue.
    transcript = []
    for turn in history[-12:]:
        who = turn.get("role", "")
        content = (turn.get("content") or "").strip()
        if not content:
            continue
        if who == "interviewer":
            transcript.append({"role": "assistant", "content": content})
        else:
            transcript.append({"role": "user", "content": content})

    msgs = [
        {"role": "system", "content": _INTERVIEWER_SYS},
        {"role": "user", "content": ctx},
        *transcript,
    ]
    # If there's no prior turn yet, prompt the model to open.
    if not transcript:
        msgs.append({"role": "user", "content": "Begin the interview now with your first question."})

    try:
        q = chat(client, msgs, model=model_primary(), temperature=0.7, max_tokens=200)
    except Exception as e:
        return {"question": "", "error": str(e)[:160]}
    q = q.strip().strip('"')
    # If model prefixed with a label like "Interviewer:", strip it.
    q = re.sub(r"^(?:interviewer|q\d*)\s*[:\-]\s*", "", q, flags=re.IGNORECASE)
    return {"question": q, "stage": stage}


def feedback(client, question: str, answer: str, resume_text: str,
             jd_text: str, role: str) -> dict:
    """Critique a single answer and return structured coaching."""
    user = (
        f"ROLE: {role or '(not specified)'}\n"
        f"JD (truncated): {jd_text[:1000]}\n\n"
        f"RESUME (truncated): {resume_text[:1500]}\n\n"
        f"INTERVIEWER QUESTION:\n{question}\n\n"
        f"CANDIDATE ANSWER:\n{answer}\n\n"
        "Return ONLY the JSON object described in the system prompt."
    )
    try:
        raw = chat(client, [
            {"role": "system", "content": _FEEDBACK_SYS},
            {"role": "user", "content": user},
        ], model=model_primary(), temperature=0.3, max_tokens=800)
    except Exception as e:
        return {"error": str(e)[:160]}

    raw = _strip_fences(raw)
    try:
        data = json.loads(raw)
    except Exception:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            return {"error": "parse_failed", "raw": raw[:200]}
        try:
            data = json.loads(m.group(0))
        except Exception:
            return {"error": "parse_failed", "raw": raw[:200]}

    # Normalize shape.
    out = {
        "score": int(data.get("score") or 0) if isinstance(data.get("score"), (int, float, str)) else 0,
        "strengths": [str(s) for s in (data.get("strengths") or [])][:5],
        "weaknesses": [str(s) for s in (data.get("weaknesses") or [])][:5],
        "star_check": data.get("star_check") or {
            "situation": False, "task": False, "action": False, "result": False,
        },
        "stronger_version": str(data.get("stronger_version") or ""),
        "followup_the_interviewer_will_ask": str(data.get("followup_the_interviewer_will_ask") or ""),
    }
    try:
        out["score"] = max(1, min(5, int(out["score"])))
    except Exception:
        out["score"] = 3
    return out

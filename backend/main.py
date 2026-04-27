"""FastAPI backend for RO Resume Agent (dashboard endpoints)."""

import asyncio
import base64
import json
from typing import Any

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse, StreamingResponse
from pydantic import BaseModel


async def run_async(fn, *args, **kwargs):
    """Offload blocking work (LLM calls, PDF generation) to a thread so the event loop stays free."""
    return await asyncio.to_thread(fn, *args, **kwargs)

from agent import get_client, generate_full_resume_json, chat, model_primary
from prompts import CONSULTANT_SYSTEM

from tools.parse_resume import parse_resume
from tools.analyze_jd import analyze_jd, gap_analysis
from tools.export import export_both_versions, ats_preflight, make_qr_png
from tools.battle import battle
from tools.xray import xray_resume, extract_jd_keywords
from tools.radar import score_role_fit
from tools.persona import persona_review
from tools.scan_sim import scan_path
from tools.coach import red_flags, seniority_calibrate, cert_recommender, salary_band, impact_coach
from tools.generators import cover_letter, linkedin_pack, job_title_optimizer, achievement_mine, jd_analyze, compare_resumes, email_draft, linkedin_import
from tools.diff import resume_diff
from tools.github import fetch_profile, fetch_top_repos, summarize_for_resume
from tools.ats_score import composite_ats_score
from tools.parser_test import parser_test_pdf
from tools.cover_letter_pdf import build_cover_letter_pdf
from tools.interview_prep import prepare_interview
from tools.mock_interview import next_question as _mock_next, feedback as _mock_feedback
from tools.resume_critique import critique as _resume_critique
from tools.resume_assist import assist as _resume_assist
from library.skills_taxonomy import categorize as categorize_skills
from tools import session as sess

from library.fonts import FONTS, ats_safe_fonts, recommend_font
from library.templates import TEMPLATES, suggest_templates
from library.personas import persona_keys, PERSONAS
from library.role_axes import axes_for_role, ROLE_AXES
from library.action_verbs import ACTION_VERBS, WEAK_PHRASES
from library.skills_taxonomy import categorize

import db as _db
import auth as _auth
from tools.extract_experience import extract_profile
from fastapi import Depends
from routers import me as me_router
from rate_limit import limit as _rl

_db.init()

app = FastAPI(title="RO Resume Agent API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

import traceback as _tb
from fastapi.requests import Request as _Req
import usage as _usage


@app.middleware("http")
async def _usage_context_middleware(request: _Req, call_next):
    """Populate usage-tracking context for every API request, then serve."""
    user_id = None
    auth = request.headers.get("authorization") or ""
    token = _auth._extract_token(auth)
    if token:
        try:
            user = _auth.user_from_token(token)
            if user:
                user_id = user.get("uid")
        except Exception:
            user_id = None
    _usage.set_context(user_id, request.url.path)
    return await call_next(request)


@app.exception_handler(Exception)
async def _all_exceptions(req: _Req, exc: Exception):
    tb = _tb.format_exc()
    print("\n=== UNCAUGHT EXCEPTION ===\n", tb, flush=True)
    return JSONResponse(
        status_code=500,
        content={"error": type(exc).__name__, "message": str(exc), "path": str(req.url.path)},
    )

_client = None

def client():
    global _client
    if _client is None:
        _client = get_client()
    return _client


@app.on_event("startup")
async def _warmup():
    """Pre-warm thread pool and validate config on boot."""
    import os
    if not os.getenv("OPENROUTER_API_KEY") and not os.getenv("GROQ_API_KEY"):
        print("[WARN] No OPENROUTER_API_KEY or GROQ_API_KEY set — LLM calls will fail.", flush=True)
    # Kick the thread pool so the first real request doesn't pay the init cost
    await asyncio.to_thread(lambda: None)
    print("[startup] warmup complete", flush=True)


# ------------------------- models -------------------------

class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str
    history: list[dict] = []
    resume_text: str = ""   # current resume loaded in app
    jd_text: str = ""       # current JD loaded in app

class AnalyzeJDRequest(BaseModel):
    jd_text: str

class GapRequest(BaseModel):
    resume_text: str
    jd_text: str

class SuggestTemplatesRequest(BaseModel):
    role: str = ""
    years: int = 0
    style_pref: str = ""
    ats_priority: str = "high"
    limit: int = 5

class BuildRequest(BaseModel):
    session_id: str | None = None
    profile_text: str
    jd_text: str = ""
    template: str
    font: str
    font_size: float = 10.0  # body text size in pt; clamped 8-13 server-side
    must_include_keywords: list[str] = []
    # Optional: if provided, skip the LLM rewrite and render this JSON directly.
    # Used by the AI Editor when the user has hand-edited the resume.
    resume_override: dict | None = None

class AIEditRequest(BaseModel):
    bullet: str
    action: str  # "rewrite" | "shorten" | "add_metric" | "stronger_verb" | "custom"
    jd_text: str = ""
    role: str = ""
    instruction: str = ""  # free-form for action=custom
    resume_text: str = ""  # optional full profile — used for hallucination check

class AISuggestSummaryRequest(BaseModel):
    resume_text: str
    current_summary: str = ""
    jd_text: str = ""
    role: str = ""

class AISuggestSkillsRequest(BaseModel):
    resume_text: str
    current_skills: list[str] = []
    jd_text: str = ""
    role: str = ""

class AISuggestBulletRequest(BaseModel):
    item_title: str = ""       # job title or project name
    item_org: str = ""         # company
    existing_bullets: list[str] = []
    jd_text: str = ""
    role: str = ""

class BattleRequest(BaseModel):
    profile_text: str
    jd_text: str = ""

class XrayRequest(BaseModel):
    resume: dict
    jd_text: str

class RadarRequest(BaseModel):
    resume_text: str
    role: str
    jd_text: str = ""

class PersonaRequest(BaseModel):
    resume_text: str
    persona_key: str
    jd_text: str = ""

class ScanRequest(BaseModel):
    resume: dict

class CoverRequest(BaseModel):
    resume_text: str
    jd_text: str
    company: str
    tone: str = "confident"

class LinkedInRequest(BaseModel):
    resume_text: str
    target_role: str

class RedFlagsRequest(BaseModel):
    resume_text: str

class SeniorityRequest(BaseModel):
    resume_text: str
    target_level: str

class CertRequest(BaseModel):
    role: str
    gaps: list[str]

class SalaryRequest(BaseModel):
    role: str
    years: int
    location: str
    resume_text: str

class ImpactRequest(BaseModel):
    bullet: str
    role_context: str

class TitleOptRequest(BaseModel):
    current_title: str
    target_role: str
    resume_text: str

class AchievementRequest(BaseModel):
    resume_text: str
    role: str

class DiffRequest(BaseModel):
    old_resume: dict
    new_resume: dict

class GithubRequest(BaseModel):
    handle_or_url: str
    role: str = ""

class PreflightRequest(BaseModel):
    pdf_base64: str


class ATSScoreRequest(BaseModel):
    resume_text: str
    jd_text: str = ""
    pdf_base64: str | None = None


class CritiqueRequest(BaseModel):
    resume_text: str
    target_role: str = ""
    jd_text: str = ""


class AssistRequest(BaseModel):
    resume_text: str
    instruction: str


# ------------------------- meta endpoints -------------------------

@app.get("/api/meta")
def meta():
    return {
        "fonts": list(FONTS.keys()),
        "ats_fonts": ats_safe_fonts(),
        "templates": [{"id": t["id"], "name": t["name"], "category": t["category"],
                       "ats_score": t["ats_score"], "style": t["style"],
                       "pages": t["pages"], "fonts": t["fonts"], "notes": t["notes"],
                       "best_for": t["best_for"]} for t in TEMPLATES],
        "personas": [{"key": k, **{kk: vv for kk, vv in v.items() if kk != "looks_for"}}
                     for k, v in PERSONAS.items()],
        "role_axes_keys": list(ROLE_AXES.keys()),
        "action_verb_categories": list(ACTION_VERBS.keys()),
        "weak_phrases": WEAK_PHRASES,
    }


# ------------------------- session -------------------------

@app.post("/api/session/new")
def session_new(_=Depends(_rl("crud_write"))):
    sid = sess.new_session_id()
    sess.save(sid, {"id": sid, "versions": [], "state": {}})
    return {"session_id": sid}

@app.get("/api/session/{sid}")
def session_get(sid: str, _=Depends(_rl("crud_read"))):
    return sess.load(sid)

@app.post("/api/session/{sid}/state")
def session_state(sid: str, state: dict, _=Depends(_rl("crud_write"))):
    return sess.update_state(sid, **state)

@app.get("/api/session/{sid}/versions")
def session_versions(sid: str, _=Depends(_rl("crud_read"))):
    return sess.list_versions(sid)

@app.get("/api/session/{sid}/versions/{vid}")
def session_version(sid: str, vid: str, _=Depends(_rl("crud_read"))):
    v = sess.get_version(sid, vid)
    if not v:
        raise HTTPException(404, "Version not found")
    return v


# ------------------------- chat (consultant) -------------------------

def _build_chat_system(req: "ChatRequest") -> str:
    """Append resume + JD context to the system prompt when the user has data loaded."""
    if not req.resume_text and not req.jd_text:
        return CONSULTANT_SYSTEM
    parts: list[str] = ["\n\n---\n# SESSION CONTEXT\n"
                        "(The user already has the following data loaded in the app. "
                        "Use it to give specific, personalised answers without asking "
                        "them to repeat information they have already provided.)\n"]
    if req.resume_text:
        parts.append(f"## User's Current Resume\n```\n{req.resume_text[:4000]}\n```")
    if req.jd_text:
        parts.append(f"## Target Job Description\n```\n{req.jd_text[:2000]}\n```")
    parts.append("---")
    return CONSULTANT_SYSTEM + "\n\n".join(parts)


def _clean_history(history: list[dict]) -> list[dict]:
    """Strip leading assistant messages so messages always start with 'user'.
    Some models (Gemma, DeepSeek) reject conversations that open with an assistant turn."""
    h = [m for m in history if m.get("role") in ("user", "assistant")]
    # Drop leading assistant messages
    while h and h[0].get("role") == "assistant":
        h = h[1:]
    return h


@app.post("/api/chat")
def chat_endpoint(req: ChatRequest, _=Depends(_rl("llm_light"))):
    system = _build_chat_system(req)
    msgs = [{"role": "system", "content": system}] + _clean_history(req.history)
    msgs.append({"role": "user", "content": req.message})
    reply = chat(client(), msgs, model=model_primary(), temperature=0.5, max_tokens=1500)
    if req.session_id:
        data = sess.load(req.session_id)
        data.setdefault("state", {}).setdefault("chat", []).extend([
            {"role": "user", "content": req.message},
            {"role": "assistant", "content": reply},
        ])
        sess.save(req.session_id, data)
    return {"reply": reply}


@app.post("/api/chat/stream")
def chat_stream_endpoint(req: ChatRequest, _=Depends(_rl("llm_light"))):
    """SSE stream: Groq first (sub-second), OpenRouter free as fallback."""
    import re as _re
    from agent import GROQ_MODELS, get_groq_client, _openrouter_pool
    system = _build_chat_system(req)
    msgs = [{"role": "system", "content": system}] + _clean_history(req.history)
    msgs.append({"role": "user", "content": req.message})

    def event_stream():
        buffer = []
        last_err = None

        # Tier 1: Groq (fast)
        groq = get_groq_client()
        if groq:
            for m in GROQ_MODELS:
                try:
                    stream = groq.chat.completions.create(
                        model=m, messages=msgs, temperature=0.5,
                        stream=True, max_tokens=1500,
                    )
                    got_any = False
                    for chunk in stream:
                        try:
                            delta = chunk.choices[0].delta.content or ""
                        except Exception:
                            delta = ""
                        if delta:
                            got_any = True
                            buffer.append(delta)
                            yield f"data: {json.dumps({'delta': delta})}\n\n"
                    if got_any:
                        break
                except Exception as e:
                    last_err = e
                    continue

        # Tier 2: OpenRouter free fallback (only if Groq produced nothing)
        if not buffer:
            try:
                cli = client()
                for m in _openrouter_pool():
                    try:
                        stream = cli.chat.completions.create(
                            model=m, messages=msgs, temperature=0.5,
                            stream=True, max_tokens=1500,
                        )
                        got_any = False
                        for chunk in stream:
                            try:
                                delta = chunk.choices[0].delta.content or ""
                            except Exception:
                                delta = ""
                            if delta:
                                got_any = True
                                buffer.append(delta)
                                yield f"data: {json.dumps({'delta': delta})}\n\n"
                        if got_any:
                            break
                    except Exception as e:
                        last_err = e
                        continue
            except Exception as e:
                last_err = e

        full = "".join(buffer)
        if not full:
            err = str(last_err) if last_err else "all models unavailable"
            yield f"data: {json.dumps({'error': err})}\n\n"
            return

        # Detect model misbehaviour: outputting its own prompt template instead of a reply
        _GARBAGE = _re.compile(
            r'\{user_message\}|\{message\}|\{prompt\}|'
            r'^User:\s*\{|^Assistant:\s*\{|'
            r'You are RO.*User:\s*\{',
            _re.IGNORECASE | _re.MULTILINE
        )
        if _GARBAGE.search(full):
            yield f"data: {json.dumps({'error': 'Model returned malformed output. Please retry.'})}\n\n"
            return

        yield f"data: {json.dumps({'done': True, 'full': full})}\n\n"

        if req.session_id:
            try:
                data = sess.load(req.session_id)
                data.setdefault("state", {}).setdefault("chat", []).extend([
                    {"role": "user", "content": req.message},
                    {"role": "assistant", "content": full},
                ])
                sess.save(req.session_id, data)
            except Exception:
                pass

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ------------------------- parse / analyze -------------------------

@app.post("/api/parse-resume")
async def parse_resume_endpoint(file: UploadFile = File(...)):
    import time as _t
    t0 = _t.time()
    data = await file.read()
    t1 = _t.time()
    try:
        text = await run_async(parse_resume, data, file.filename or "")
    except Exception as e:
        raise HTTPException(400, f"Parse failed: {e}")
    t2 = _t.time()
    print(f"[parse-resume] read={int((t1-t0)*1000)}ms parse={int((t2-t1)*1000)}ms "
          f"bytes={len(data)} chars={len(text)} file={file.filename}", flush=True)
    return {"text": text, "chars": len(text), "filename": file.filename}

@app.post("/api/analyze-jd")
def analyze_jd_endpoint(req: AnalyzeJDRequest, _=Depends(_rl("llm_light"))):
    return analyze_jd(client(), req.jd_text, model_primary())


@app.post("/api/resume-critique")
async def resume_critique_endpoint(req: CritiqueRequest, _=Depends(_rl("llm_light"))):
    """Structured LLM review — summary, skills, bullets, ATS issues."""
    return await run_async(_resume_critique, client(), req.resume_text, req.target_role, req.jd_text)


@app.post("/api/resume-assist")
async def resume_assist_endpoint(req: AssistRequest, _=Depends(_rl("llm_light"))):
    """Take a free-form instruction (e.g. 'add a project about X'),
    return updated resume text + summary of changes."""
    return await run_async(_resume_assist, client(), req.resume_text, req.instruction)

@app.post("/api/gap-analysis")
def gap_endpoint(req: GapRequest, _=Depends(_rl("llm_light"))):
    return gap_analysis(client(), req.resume_text, req.jd_text, model_primary())

@app.post("/api/suggest-templates")
def suggest_endpoint(req: SuggestTemplatesRequest):
    return {"templates": suggest_templates(req.role, req.years, req.style_pref,
                                             req.ats_priority, limit=req.limit)}


# ------------------------- build & export -------------------------

@app.post("/api/build")
async def build_endpoint(req: BuildRequest, _=Depends(_rl("build"))):
    import re
    _FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)
    _PLACEHOLDER = re.compile(r"\s*(?:,\s*)?(?:by|of|to|with|from|at|achieving|resulting in|yielding|delivering)?\s*\[[^\]]*\]\s*%?", re.IGNORECASE)
    _PLACEHOLDER_TAIL = re.compile(r"\s*(?:,?\s*(?:resulting in|achieving|yielding|delivering|with)\s+)?\b(?:TBD|XX%?|N%?)\b\.?", re.IGNORECASE)

    def _clean_bullet(s: str) -> str:
        s = _PLACEHOLDER.sub("", s)
        s = _PLACEHOLDER_TAIL.sub("", s)
        s = re.sub(r"\s{2,}", " ", s).strip(" ,.;:-")
        if s and not s.endswith("."):
            s += "."
        return s

    def _parse_and_clean(raw: str) -> dict:
        raw = _FENCE.sub("", raw.strip())
        try:
            resume = json.loads(raw)
        except Exception:
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            resume = json.loads(m.group(0)) if m else {}
        for key in ("experience", "projects"):
            for item in resume.get(key) or []:
                if isinstance(item, dict) and isinstance(item.get("bullets"), list):
                    item["bullets"] = [_clean_bullet(str(b)) for b in item["bullets"] if b]
        if isinstance(resume.get("summary"), str):
            resume["summary"] = _clean_bullet(resume["summary"])
        return resume

    # If the user hand-edited the resume (AI Editor), skip the LLM rewrite and render the JSON as-is.
    if req.resume_override:
        tailored = _parse_and_clean(json.dumps(req.resume_override))
        original = None
    else:
        if req.jd_text:
            # Run tailored + original baseline IN PARALLEL — cuts latency roughly in half.
            tailored_raw, original_raw = await asyncio.gather(
                run_async(generate_full_resume_json,
                          client(), req.profile_text, req.jd_text, req.template, req.font,
                          tailor=True, must_include_keywords=req.must_include_keywords or None),
                run_async(generate_full_resume_json,
                          client(), req.profile_text, "", req.template, req.font,
                          tailor=False),
                return_exceptions=True,
            )
            tailored = _parse_and_clean(tailored_raw if isinstance(tailored_raw, str) else json.dumps({}))
            original = _parse_and_clean(original_raw) if isinstance(original_raw, str) else None
        else:
            # No JD — single call only
            tailored_raw = await run_async(
                generate_full_resume_json,
                client(), req.profile_text, req.jd_text, req.template, req.font,
                tailor=True, must_include_keywords=req.must_include_keywords or None,
            )
            tailored = _parse_and_clean(tailored_raw)
            original = None

    font_size = max(8.0, min(13.0, float(req.font_size or 10.0)))
    files = export_both_versions(tailored, req.font, req.template, font_size=font_size)
    b64 = {
        "styled_docx": base64.b64encode(files["styled_docx"]).decode(),
        "styled_pdf":  base64.b64encode(files["styled_pdf"]).decode(),
        "ats_docx":    base64.b64encode(files["ats_docx"]).decode(),
        "ats_pdf":     base64.b64encode(files["ats_pdf"]).decode(),
    }

    if original is not None:
        orig_files = export_both_versions(original, req.font, req.template, font_size=font_size)
        b64["original_pdf"]  = base64.b64encode(orig_files["styled_pdf"]).decode()
        b64["original_docx"] = base64.b64encode(orig_files["styled_docx"]).decode()

    preflight_styled = ats_preflight(files["styled_pdf"])
    preflight_ats = ats_preflight(files["ats_pdf"])

    if req.session_id:
        sess.add_version(req.session_id, label=req.template, resume=tailored,
                          meta={"font": req.font, "template": req.template})

    skills_categorized = categorize_skills(tailored.get("skills") or []) if tailored else {}

    return {
        "resume": tailored,
        "original_resume": original,
        "files_base64": b64,
        "styled_font": files["styled_font"],
        "ats_font": files["ats_font"],
        "preflight_styled": preflight_styled,
        "preflight_ats": preflight_ats,
        "tailored": original is not None,
        "skills_categorized": skills_categorized,
    }


@app.post("/api/ai-edit-bullet")
def ai_edit_bullet(req: AIEditRequest, _=Depends(_rl("llm_light"))):
    """Rewrite a single resume bullet on-demand, preserving factual claims."""
    action_prompts = {
        "rewrite":       "Rewrite it to be stronger and more specific. Use an impact-first structure (verb → what → outcome).",
        "shorten":       "Rewrite it to be at most 18 words while preserving all factual claims and the most impactful outcome.",
        "add_metric":    "Rewrite to add a plausible qualitative outcome if no metric exists (e.g., 'reducing manual review time', 'improving throughput'). NEVER invent numeric metrics.",
        "stronger_verb": "Replace the leading verb with a stronger action verb (e.g., 'led', 'architected', 'spearheaded', 'delivered'). Do not change any facts.",
        "custom":        req.instruction or "Improve this bullet.",
    }
    instruction = action_prompts.get(req.action, action_prompts["rewrite"])

    system = (
        "You rewrite ONE resume bullet on request. Rules: "
        "1) Preserve every factual claim — companies, tools, numbers, actions actually taken. "
        "2) Never fabricate metrics, skills, or experience. "
        "3) Output ONLY the rewritten bullet as a single sentence. "
        "4) No quotes, no prefix ('Rewritten:'), no trailing commentary, no markdown. "
        "5) End with a period."
    )
    ctx = []
    if req.role:
        ctx.append(f"Target role: {req.role}")
    if req.jd_text:
        ctx.append(f"Target JD (for vocabulary alignment):\n{req.jd_text}")
    ctx_block = "\n\n".join(ctx) + ("\n\n" if ctx else "")

    user = (
        f"{ctx_block}"
        f"ORIGINAL BULLET:\n{req.bullet}\n\n"
        f"INSTRUCTION: {instruction}"
    )
    try:
        out = chat(
            client(),
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.4,
            max_tokens=180,
        ).strip()
    except Exception as e:
        return {"bullet": req.bullet, "error": str(e)}

    import re
    out = re.sub(r"^[\"'\-\*•\s]+|[\"']+$", "", out).strip()
    out = re.sub(r"^(rewritten|new|improved|result)\s*[:\-]\s*", "", out, flags=re.IGNORECASE)
    if out and not out.endswith((".", "!", "?")):
        out += "."

    hallucinations = _detect_hallucinations(out, req.bullet, req.resume_text)
    return {"bullet": out or req.bullet, "hallucinations": hallucinations}


def _detect_hallucinations(new_text: str, original_bullet: str, resume_text: str) -> list[str]:
    """Flag numbers / acronyms / proper-noun tokens in new_text that weren't in
    the original bullet OR the full profile. These are candidate fabrications."""
    import re
    flags: list[str] = []
    source = (original_bullet + "\n" + (resume_text or "")).lower()

    # Numeric claims: any number with a %, k, m, x, or bare 2+ digit int
    for m in re.finditer(r"\b\d+(?:\.\d+)?\s?[%kKmMxX]?\b", new_text):
        token = m.group(0).strip()
        if token.lower() not in source and token.rstrip("%kKmMxX").strip() not in source:
            flags.append(f"number '{token}' not in your profile")

    # Acronyms / proper nouns: 2-5 uppercase letters in a row (AWS, GCP, API, SQL)
    for m in re.finditer(r"\b[A-Z]{2,5}\b", new_text):
        token = m.group(0)
        if token.lower() not in source:
            flags.append(f"acronym '{token}' not in your profile")

    # Dedupe + cap
    seen = set()
    unique = []
    for f in flags:
        if f not in seen:
            seen.add(f)
            unique.append(f)
    return unique[:5]


@app.post("/api/ai-suggest-summary")
def ai_suggest_summary(req: AISuggestSummaryRequest, _=Depends(_rl("llm_light"))):
    """Draft a fresh 2-3 sentence resume summary tailored to role/JD."""
    system = (
        "You draft ONE resume summary (2-3 sentences). Rules: "
        "1) Only use facts evidenced in the candidate's profile — never invent experience, years, or skills. "
        "2) Mirror the JD's role title and vocabulary when a JD is provided. "
        "3) Lead with seniority + core domain, then 1-2 signature strengths, then a forward-looking hook. "
        "4) Output ONLY the summary text — no quotes, no heading, no markdown."
    )
    ctx = []
    if req.role:
        ctx.append(f"Target role: {req.role}")
    if req.jd_text:
        ctx.append(f"Target JD:\n{req.jd_text}")
    if req.current_summary:
        ctx.append(f"Current summary (refine, don't repeat verbatim):\n{req.current_summary}")
    ctx.append(f"Candidate profile (source of truth):\n{req.resume_text[:6000]}")
    user = "\n\n".join(ctx)
    try:
        out = chat(
            client(),
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.5,
            max_tokens=220,
        ).strip()
    except Exception as e:
        return {"summary": req.current_summary, "error": str(e)}
    import re
    out = re.sub(r'^["\'\s]+|["\']+$', "", out).strip()
    out = re.sub(r"^(summary|profile)\s*[:\-]\s*", "", out, flags=re.IGNORECASE)
    return {"summary": out or req.current_summary}


@app.post("/api/ai-suggest-skills")
def ai_suggest_skills(req: AISuggestSkillsRequest, _=Depends(_rl("llm_light"))):
    """Suggest skills to add, grounded in resume evidence + JD demand."""
    system = (
        "You suggest resume skills to add. Rules: "
        "1) Only suggest skills with clear evidence in the candidate's profile (tools, frameworks, languages they actually used). "
        "2) Prefer skills the JD explicitly asks for, IF the profile shows evidence. "
        "3) Never fabricate skills the candidate doesn't have. "
        "4) Skip skills already in current_skills. "
        "5) Output JSON only: {\"add\": [\"skill1\", \"skill2\", ...]} with up to 12 items, short names (1-3 words)."
    )
    ctx = [f"Current skills: {', '.join(req.current_skills) if req.current_skills else '(none)'}"]
    if req.role:
        ctx.append(f"Target role: {req.role}")
    if req.jd_text:
        ctx.append(f"Target JD:\n{req.jd_text}")
    ctx.append(f"Candidate profile (source of truth):\n{req.resume_text[:6000]}")
    user = "\n\n".join(ctx)
    try:
        out = chat(
            client(),
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.3,
            max_tokens=300,
        ).strip()
    except Exception as e:
        return {"add": [], "error": str(e)}
    import re
    m = re.search(r"\{.*\}", out, flags=re.DOTALL)
    if not m:
        return {"add": []}
    try:
        data = json.loads(m.group(0))
        add = data.get("add", [])
        current_lc = {s.lower() for s in req.current_skills}
        clean = []
        seen = set()
        for s in add:
            if not isinstance(s, str):
                continue
            s = s.strip().strip(".,;")
            if not s or s.lower() in current_lc or s.lower() in seen:
                continue
            seen.add(s.lower())
            clean.append(s)
        return {"add": clean[:12]}
    except Exception:
        return {"add": []}


@app.post("/api/ai-suggest-bullet")
def ai_suggest_bullet(req: AISuggestBulletRequest, _=Depends(_rl("llm_light"))):
    """Draft one new bullet for an experience/project item."""
    system = (
        "You draft ONE new resume bullet. Rules: "
        "1) The bullet must be plausibly true for the given role/company — don't invent specific projects or numbers the user didn't mention. "
        "2) Prefer JD vocabulary if a JD is provided. "
        "3) Impact-first structure: strong verb → what → qualitative outcome. "
        "4) 16-24 words. Output ONLY the bullet as one sentence. No quotes, no prefix, no markdown. End with a period."
    )
    ctx = []
    if req.item_title:
        ctx.append(f"Role/Project: {req.item_title}" + (f" at {req.item_org}" if req.item_org else ""))
    if req.role:
        ctx.append(f"Target role (for tone): {req.role}")
    if req.jd_text:
        ctx.append(f"Target JD (for vocabulary):\n{req.jd_text}")
    if req.existing_bullets:
        ctx.append("Existing bullets (don't duplicate these):\n- " + "\n- ".join(req.existing_bullets[:8]))
    user = "\n\n".join(ctx) + "\n\nWrite ONE new bullet that complements the existing ones."
    try:
        out = chat(
            client(),
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.5,
            max_tokens=120,
        ).strip()
    except Exception as e:
        return {"bullet": "", "error": str(e)}
    import re
    out = re.sub(r"^[\"'\-\*•\s]+|[\"']+$", "", out).strip()
    out = re.sub(r"^(bullet|new)\s*[:\-]\s*", "", out, flags=re.IGNORECASE)
    if out and not out.endswith((".", "!", "?")):
        out += "."
    return {"bullet": out}


class ParserTestRequest(BaseModel):
    pdf_base64: str


class CoverLetterPdfRequest(BaseModel):
    text: str
    company: str = ""


@app.post("/api/cover-letter-pdf")
def cover_letter_pdf_endpoint(req: CoverLetterPdfRequest):
    pdf = build_cover_letter_pdf(req.text, req.company)
    return {"pdf_base64": base64.b64encode(pdf).decode("ascii")}


@app.post("/api/parser-test")
def parser_test_endpoint(req: ParserTestRequest):
    """Run real open-source ATS-style parsing on the PDF. Returns ground truth
    of what fields a parser would extract, so you can spot parse failures."""
    try:
        pdf = base64.b64decode(req.pdf_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64: {e}")
    return parser_test_pdf(pdf)


@app.post("/api/preflight")
def preflight_endpoint(req: PreflightRequest):
    pdf = base64.b64decode(req.pdf_base64)
    return ats_preflight(pdf)


@app.post("/api/ats-score")
async def ats_score_endpoint(req: ATSScoreRequest, _=Depends(_rl("llm_light"))):
    pdf = base64.b64decode(req.pdf_base64) if req.pdf_base64 else None
    return await run_async(
        composite_ats_score, client(), req.resume_text, req.jd_text, pdf, model_primary()
    )


@app.get("/api/qr")
def qr_endpoint(url: str):
    png = make_qr_png(url)
    return Response(content=png, media_type="image/png")


# ------------------------- novel tools -------------------------

@app.post("/api/battle")
def battle_endpoint(req: BattleRequest, _=Depends(_rl("llm_heavy"))):
    return battle(client(), req.profile_text, req.jd_text)

@app.post("/api/xray")
def xray_endpoint(req: XrayRequest, _=Depends(_rl("llm_light"))):
    return xray_resume(req.resume, req.jd_text)

@app.post("/api/xray/keywords")
def xray_keywords(req: AnalyzeJDRequest):
    return {"keywords": extract_jd_keywords(req.jd_text)}

@app.post("/api/radar")
def radar_endpoint(req: RadarRequest, _=Depends(_rl("llm_light"))):
    return score_role_fit(client(), req.resume_text, req.role, req.jd_text)

@app.post("/api/persona")
def persona_endpoint(req: PersonaRequest, _=Depends(_rl("llm_light"))):
    return persona_review(client(), req.resume_text, req.persona_key, req.jd_text)

@app.post("/api/scan")
def scan_endpoint(req: ScanRequest, _=Depends(_rl("llm_light"))):
    return scan_path(client(), req.resume)


# ------------------------- coach -------------------------

@app.post("/api/red-flags")
def red_flags_endpoint(req: RedFlagsRequest):
    return red_flags(req.resume_text)

@app.post("/api/seniority")
def seniority_endpoint(req: SeniorityRequest, _=Depends(_rl("llm_light"))):
    return seniority_calibrate(client(), req.resume_text, req.target_level)

@app.post("/api/certs")
def cert_endpoint(req: CertRequest, _=Depends(_rl("llm_light"))):
    return cert_recommender(client(), req.role, req.gaps)

@app.post("/api/salary")
def salary_endpoint(req: SalaryRequest, _=Depends(_rl("llm_light"))):
    return salary_band(client(), req.role, req.years, req.location, req.resume_text)

@app.post("/api/impact-coach")
def impact_endpoint(req: ImpactRequest, _=Depends(_rl("llm_light"))):
    return impact_coach(client(), req.bullet, req.role_context)


# ------------------------- generators -------------------------

@app.post("/api/cover-letter")
def cover_endpoint(req: CoverRequest, _=Depends(_rl("llm_light"))):
    return {"letter": cover_letter(client(), req.resume_text, req.jd_text, req.company, req.tone)}

@app.post("/api/linkedin")
def linkedin_endpoint(req: LinkedInRequest, _=Depends(_rl("llm_light"))):
    return linkedin_pack(client(), req.resume_text, req.target_role)

@app.post("/api/title-optimizer")
def title_endpoint(req: TitleOptRequest, _=Depends(_rl("llm_light"))):
    return job_title_optimizer(client(), req.current_title, req.target_role, req.resume_text)

@app.post("/api/achievement-mine")
def achievement_endpoint(req: AchievementRequest, _=Depends(_rl("llm_light"))):
    return achievement_mine(client(), req.resume_text, req.role)


# ------------------------- diff + github + skills -------------------------

@app.post("/api/diff")
def diff_endpoint(req: DiffRequest):
    return {"diffs": resume_diff(req.old_resume, req.new_resume)}


@app.get("/api/session/{sid}/compare")
def compare_versions(sid: str, a: str, b: str, _=Depends(_rl("crud_read"))):
    """Diff two saved versions within a session. `a` and `b` are version ids."""
    va = sess.get_version(sid, a)
    vb = sess.get_version(sid, b)
    if not va or not vb:
        raise HTTPException(404, "One or both versions not found")
    return {
        "a": {"id": va["id"], "label": va.get("label", ""), "created_at": va.get("created_at")},
        "b": {"id": vb["id"], "label": vb.get("label", ""), "created_at": vb.get("created_at")},
        "diffs": resume_diff(va.get("resume") or {}, vb.get("resume") or {}),
    }

@app.post("/api/github")
def github_endpoint(req: GithubRequest, _=Depends(_rl("llm_light"))):
    handle = (req.handle_or_url or "").strip()
    if not handle or "yourhandle" in handle.lower():
        raise HTTPException(400, "Enter a real GitHub handle or URL (not the placeholder).")
    try:
        profile = fetch_profile(handle)
    except Exception as e:
        raise HTTPException(404, f"GitHub user not found: {e}")
    try:
        repos = fetch_top_repos(handle, limit=10)
    except Exception as e:
        repos = []
    summarized = {}
    if req.role and repos:
        try:
            summarized = summarize_for_resume(client(), repos, req.role)
        except Exception as e:
            summarized = {"selected": [], "summarize_error": str(e)}
    else:
        summarized = {"selected": []}
    return {"profile": profile, "repos": repos, **summarized}


class SkillsRequest(BaseModel):
    skills: list[str]

@app.post("/api/categorize-skills")
def categorize_endpoint(req: SkillsRequest):
    return categorize(req.skills)


@app.get("/api/models")
def models_endpoint():
    from agent import fetch_free_models, model_pool
    return {"live_free": fetch_free_models(force=True)[:50], "in_use_order": model_pool()[:20]}


class InterviewPrepRequest(BaseModel):
    resume_text: str
    jd_text: str = ""
    role: str = ""


@app.post("/api/interview-prep")
async def interview_prep_endpoint(req: InterviewPrepRequest, _=Depends(_rl("llm_heavy"))):
    return await run_async(prepare_interview, client(), req.resume_text, req.jd_text, req.role)


class MockInterviewTurnRequest(BaseModel):
    resume_text: str = ""
    jd_text: str = ""
    role: str = ""
    history: list = []
    stage: str = "warmup"


class MockInterviewFeedbackRequest(BaseModel):
    question: str
    answer: str
    resume_text: str = ""
    jd_text: str = ""
    role: str = ""


@app.post("/api/mock-interview/turn")
async def mock_interview_turn(req: MockInterviewTurnRequest, _=Depends(_rl("llm_light"))):
    return await run_async(
        _mock_next, client(), req.resume_text, req.jd_text, req.role, req.history, req.stage,
    )


@app.post("/api/mock-interview/feedback")
async def mock_interview_feedback(req: MockInterviewFeedbackRequest, _=Depends(_rl("llm_light"))):
    return await run_async(
        _mock_feedback, client(), req.question, req.answer, req.resume_text, req.jd_text, req.role,
    )


@app.get("/")
def root():
    return {"service": "RO Resume Agent", "status": "ok"}


# ------------------------- auth + per-user endpoints (routers/me.py) -------------------------

app.include_router(me_router.router)
me_router.register_extract_profile(app, client)


# ------------------------- new generator endpoints -------------------------

class JDAnalyzeReq(BaseModel):
    jd_text: str

@app.post("/api/jd-analyze")
async def api_jd_analyze(req: JDAnalyzeReq, _=Depends(_rl("llm_light"))):
    result = await run_async(jd_analyze, get_client(), req.jd_text)
    return result


class MultiCompareReq(BaseModel):
    resume_a: str
    resume_b: str
    jd_text: str = ""

@app.post("/api/multi-compare")
async def api_multi_compare(req: MultiCompareReq, _=Depends(_rl("llm_light"))):
    result = await run_async(compare_resumes, get_client(), req.resume_a, req.resume_b, req.jd_text)
    return result


class EmailDraftReq(BaseModel):
    resume_text: str
    jd_text: str = ""
    company: str = ""
    role: str = ""
    tone: str = "confident"

@app.post("/api/email-draft")
async def api_email_draft(req: EmailDraftReq, _=Depends(_rl("llm_light"))):
    result = await run_async(email_draft, get_client(), req.resume_text, req.jd_text, req.company, req.role, req.tone)
    return result


class LinkedInImportReq(BaseModel):
    linkedin_text: str

@app.post("/api/linkedin-import")
async def api_linkedin_import(req: LinkedInImportReq, _=Depends(_rl("llm_light"))):
    result = await run_async(linkedin_import, get_client(), req.linkedin_text)
    return result

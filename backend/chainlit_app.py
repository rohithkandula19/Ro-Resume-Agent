"""Chainlit consultant chat — the voice of RO Resume Agent.

Embedded into the Next.js dashboard as a Copilot widget. Shares state via the
FastAPI `/api/session` endpoints.
"""

import os
import httpx
import chainlit as cl

from agent import get_client, chat, model_primary
from prompts import CONSULTANT_SYSTEM
from tools.parse_resume import parse_resume


API_BASE = os.getenv("API_BASE", "http://localhost:8000")
_openrouter = get_client()


async def _sync_state(session_id: str, **state):
    if not session_id:
        return
    async with httpx.AsyncClient(timeout=10) as c:
        try:
            await c.post(f"{API_BASE}/api/session/{session_id}/state", json=state)
        except Exception:
            pass


@cl.on_chat_start
async def start():
    # create (or reuse) a session
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(f"{API_BASE}/api/session/new")
        sid = r.json()["session_id"] if r.status_code == 200 else ""
    cl.user_session.set("session_id", sid)
    cl.user_session.set("history", [])

    intro = (
        "Hi — I'm **RO Resume Agent**, your AI resume consultant.\n\n"
        "Upload your current resume (PDF/DOCX) any time, paste a target JD, or just "
        "tell me what role you're targeting. I'll ask a few quick questions and then "
        "guide you to a recruiter-ready resume tailored to your target.\n\n"
        "What role are you aiming for, and where are you in your career?"
    )
    await cl.Message(content=intro).send()


@cl.on_message
async def on_message(message: cl.Message):
    history = cl.user_session.get("history") or []
    session_id = cl.user_session.get("session_id")

    # If files attached, parse them and add context
    attached_text = ""
    for el in message.elements or []:
        if isinstance(el, cl.File):
            try:
                with open(el.path, "rb") as f:
                    data = f.read()
                parsed = parse_resume(data, el.name or "")
                attached_text += f"\n\n[UPLOADED RESUME — {el.name}]\n{parsed[:6000]}"
                await _sync_state(session_id, resume_text=parsed, last_filename=el.name)
            except Exception as e:
                await cl.Message(content=f"Could not parse {el.name}: {e}").send()

    user_content = (message.content or "") + attached_text

    msgs = [{"role": "system", "content": CONSULTANT_SYSTEM}] + history
    msgs.append({"role": "user", "content": user_content})

    # stream via chainlit
    msg = cl.Message(content="")
    await msg.send()
    try:
        reply = chat(_openrouter, msgs, model=model_primary(),
                     temperature=0.5, max_tokens=1500)
    except Exception as e:
        reply = f"(model error: {e})"
    msg.content = reply
    await msg.update()

    history.append({"role": "user", "content": user_content})
    history.append({"role": "assistant", "content": reply})
    cl.user_session.set("history", history)

    # mirror to backend session for the dashboard
    await _sync_state(session_id, chat=history[-40:])


@cl.action_callback("run_battle")
async def on_run_battle(action: cl.Action):
    session_id = cl.user_session.get("session_id")
    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.get(f"{API_BASE}/api/session/{session_id}")
        state = (r.json().get("state") or {}) if r.status_code == 200 else {}
        profile = state.get("resume_text", "")
        jd = state.get("jd_text", "")
        if not profile:
            await cl.Message(content="Upload your resume first.").send()
            return
        await cl.Message(content="Running Battle Mode — generating 3 variants and scoring…").send()
        rr = await c.post(f"{API_BASE}/api/battle",
                           json={"profile_text": profile, "jd_text": jd})
        data = rr.json()
    winner = data.get("winner")
    lines = [f"**Winner: `{winner}`**"]
    for k, v in (data.get("variants") or {}).items():
        s = v.get("score") or {}
        lines.append(f"- **{k}** — overall {s.get('overall','?')}, ATS {s.get('ats_match_percent','?')}%")
    await cl.Message(content="\n".join(lines)).send()

"""Cover letter, LinkedIn headline/About, job-title optimizer, achievement miner."""

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


def cover_letter(client, resume_text: str, jd_text: str, company: str, tone: str = "confident") -> str:
    system = (
        "Write a short, SPECIFIC cover letter. 3 tight paragraphs, under 250 words total.\n\n"
        "HARD BANS — any one of these means the letter fails:\n"
        "- NEVER open with 'As a seasoned X with expertise in Y...' or 'I am writing to express my interest...' or 'I am excited to apply...' or 'With X years of experience...'\n"
        "- NEVER use the phrases: 'I believe', 'passionate about', 'seasoned', 'proven track record', 'results-driven', 'team player', 'dynamic', 'synergy'.\n"
        "- NEVER invent products, initiatives, metrics, or facts about the company or the candidate.\n\n"
        "PARAGRAPH 1 — SPECIFIC HOOK (most important):\n"
        "  Anchor on a concrete detail in the JD itself — a product named, a technical challenge stated, a team mission, or a specific problem the role is solving. Quote or paraphrase it. Connect it in ONE sentence to something the candidate has actually done. If the JD has nothing specific, pick the single most technical requirement and open with how the candidate delivered it elsewhere.\n"
        "PARAGRAPH 2 — EVIDENCE:\n"
        "  2-3 concrete achievements FROM THE RESUME, each mapped to a specific JD requirement. Use the exact technology names the JD uses. Include any real numbers the resume has; do NOT invent them.\n"
        "PARAGRAPH 3 — WHY THIS ROLE:\n"
        "  One sharp sentence on why this specific role (not the whole company — the role). End with a direct, confident closing sentence. No 'look forward to hearing from you' fluff.\n\n"
        "Tone: {tone}. Plain prose only. No 'Dear Hiring Manager' header (the user adds that). Start with paragraph 1 directly."
    ).replace("{tone}", tone)
    user = (
        f"COMPANY: {company}\n\n"
        f"JOB DESCRIPTION (mine this for the specific hook and vocabulary):\n{jd_text}\n\n"
        f"CANDIDATE RESUME (source of truth — never invent beyond this):\n{resume_text}"
    )
    return chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=model_primary(), temperature=0.6, max_tokens=900,
    )


def linkedin_pack(client, resume_text: str, target_role: str) -> dict:
    system = (
        "Generate a LinkedIn optimization pack. Return VALID JSON only: "
        "{headline:string, about:string, featured_skills:[string], "
        "experience_bullets:[{role:string, bullets:[string]}]}. "
        "Headline: <=220 chars, keyword-rich. About: 3-4 paragraphs, first-person OK here. "
        "No prose outside JSON."
    )
    user = f"TARGET ROLE: {target_role}\n\nRESUME:\n{resume_text}"
    raw = chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=model_primary(), temperature=0.5, max_tokens=1600,
    )
    return _parse_json(raw)


def job_title_optimizer(client, current_title: str, target_role: str, resume_text: str) -> dict:
    system = (
        "Suggest optimal job titles for a resume to maximize search + ATS match. "
        "Return VALID JSON only: "
        "{current:string, suggestions:[{title:string, why:string, risk:string}]}. "
        "risk: 'none' | 'misrepresentation' | 'overreach'. Be honest. No prose."
    )
    user = f"CURRENT: {current_title}\nTARGET: {target_role}\n\nRESUME:\n{resume_text}"
    raw = chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=model_primary(), temperature=0.4, max_tokens=600,
    )
    return _parse_json(raw)


def achievement_mine(client, resume_text: str, role: str) -> dict:
    """Socratic questions to extract stories the user forgot."""
    system = (
        "You are an achievement-mining coach. Read the resume and ask 6-8 specific "
        "Socratic questions designed to extract measurable impact stories the user "
        "likely forgot to include. Return VALID JSON only: "
        "{questions:[{category:string, question:string, why:string}]}. "
        "Categories: 'metrics', 'leadership', 'scope', 'initiative', 'cross_functional', "
        "'technical_depth', 'outcomes'. No prose."
    )
    user = f"ROLE: {role}\n\nRESUME:\n{resume_text}"
    raw = chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=model_primary(), temperature=0.5, max_tokens=1400,
    )
    return _parse_json(raw)


def jd_analyze(client, jd_text: str) -> dict:
    """Analyze a JD for culture signals, red flags, green flags, and negotiation tips."""
    system = (
        "You are a career strategist. Analyze this job description deeply. "
        "Return VALID JSON only — no prose outside JSON:\n"
        "{"
        "\"culture_signals\": [string, ...], "
        "\"red_flags\": [{flag: string, reason: string}, ...], "
        "\"green_flags\": [{flag: string, reason: string}, ...], "
        "\"negotiation_tips\": [string, ...], "
        "\"urgency\": \"high|medium|low\", "
        "\"urgency_reason\": string, "
        "\"ideal_traits\": [string, ...], "
        "\"interview_style\": string, "
        "\"comp_hints\": string, "
        "\"questions_to_ask\": [string, ...]"
        "}\n"
        "Red flags: vague role scope, excessive requirements, toxic phrasing, unrealistic expectations. "
        "Green flags: clear deliverables, growth paths, realistic requirements, good signals. "
        "Negotiation tips: salary, equity, remote, signing bonus based on clues in JD. "
        "Be honest and specific — not generic advice."
    )
    raw = chat(client, [{"role": "system", "content": system}, {"role": "user", "content": f"JD:\n{jd_text}"}],
               model=model_primary(), temperature=0.4, max_tokens=1600)
    return _parse_json(raw)


def compare_resumes(client, resume_a: str, resume_b: str, jd_text: str) -> dict:
    """Compare two resumes against a JD and pick the stronger one."""
    system = (
        "You are a senior recruiter. Compare Resume A vs Resume B against this job description. "
        "Return VALID JSON only:\n"
        "{"
        "\"winner\": \"A\"|\"B\"|\"tie\", "
        "\"score_a\": int (0-100), "
        "\"score_b\": int (0-100), "
        "\"verdict\": string (1 sentence), "
        "\"a_strengths\": [string, ...], "
        "\"b_strengths\": [string, ...], "
        "\"a_weaknesses\": [string, ...], "
        "\"b_weaknesses\": [string, ...], "
        "\"recommendation\": string"
        "}\n"
        "Be specific — cite actual content, not generic praise. "
        "Score based on: keyword match, experience relevance, impact quantification, seniority fit."
    )
    user = f"JD:\n{jd_text}\n\n---RESUME A---\n{resume_a}\n\n---RESUME B---\n{resume_b}"
    raw = chat(client, [{"role": "system", "content": system}, {"role": "user", "content": user}],
               model=model_primary(), temperature=0.3, max_tokens=1400)
    return _parse_json(raw)


def email_draft(client, resume_text: str, jd_text: str, company: str, role: str, tone: str = "confident") -> dict:
    """Draft an application email to send alongside the resume."""
    system = (
        "Write a SHORT application email (not a cover letter). 3-4 sentences max. "
        "Subject line + body. Return VALID JSON only: {\"subject\": string, \"body\": string}.\n\n"
        "Rules:\n"
        "- Subject: direct, includes role name and one key qualifier\n"
        "- Body: 1 sentence intro (who you are + one standout fact), "
        "1 sentence why this specific role/company (be specific to JD), "
        "1 sentence CTA (availability, attached resume). "
        "- NO 'I am excited to apply', 'passionate', 'team player', 'proven track record'\n"
        "- Tone: {tone}. Under 80 words body."
    ).replace("{tone}", tone)
    user = f"COMPANY: {company}\nROLE: {role}\n\nJD:\n{jd_text}\n\nRESUME (for facts only):\n{resume_text}"
    raw = chat(client, [{"role": "system", "content": system}, {"role": "user", "content": user}],
               model=model_primary(), temperature=0.5, max_tokens=400)
    return _parse_json(raw)


def linkedin_import(client, linkedin_text: str) -> dict:
    """Parse pasted LinkedIn profile text into a structured resume dict."""
    system = (
        "Convert this pasted LinkedIn profile text into a structured resume. "
        "Return VALID JSON only:\n"
        "{"
        "\"name\": string, "
        "\"headline\": string, "
        "\"summary\": string, "
        "\"experience\": [{title: string, org: string, dates: string, bullets: [string]}], "
        "\"education\": [{degree: string, school: string, dates: string}], "
        "\"skills\": [string], "
        "\"resume_text\": string"
        "}\n"
        "resume_text: a clean plain-text resume version (for further processing). "
        "Extract all dates, roles, companies, and measurable achievements you find. "
        "If something is missing, omit it rather than guessing."
    )
    raw = chat(client, [{"role": "system", "content": system}, {"role": "user", "content": f"LINKEDIN PROFILE:\n{linkedin_text}"}],
               model=model_primary(), temperature=0.2, max_tokens=2000)
    return _parse_json(raw)

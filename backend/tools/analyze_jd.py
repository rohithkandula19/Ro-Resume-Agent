"""JD keyword extraction and gap analysis via OpenRouter LLM."""

import json
import re
from typing import Any

from prompts import JD_ANALYZER_SYSTEM, GAP_ANALYZER_SYSTEM


def _extract_json(text: str) -> dict:
    """Best-effort JSON extraction from model output."""
    if not text:
        return {}
    # strip markdown fences
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)
    try:
        return json.loads(text)
    except Exception:
        pass
    # find first { ... last }
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return {}
    return {}


def analyze_jd(client, jd_text: str, model: str) -> dict[str, Any]:
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": JD_ANALYZER_SYSTEM},
            {"role": "user", "content": jd_text},
        ],
        temperature=0.2,
    )
    return _extract_json(resp.choices[0].message.content)


def gap_analysis(client, resume_text: str, jd_text: str, model: str) -> dict[str, Any]:
    """Ask the LLM for gap analysis. Routes through the Groq-first unified chat()
    so the call survives OpenRouter flakiness (instead of silently returning 0)."""
    from agent import chat as unified_chat
    user_content = (
        f"OLD RESUME:\n---\n{resume_text}\n---\n\n"
        f"TARGET JOB DESCRIPTION:\n---\n{jd_text}\n---"
    )
    content = unified_chat(
        client,
        [
            {"role": "system", "content": GAP_ANALYZER_SYSTEM},
            {"role": "user", "content": user_content},
        ],
        model=model or None,
        temperature=0.2,
        max_tokens=1500,
    )
    return _extract_json(content)


def format_analysis_markdown(jd: dict, gap: dict) -> str:
    lines = ["## JD Analysis"]
    if jd:
        for k in ("required_skills", "preferred_skills", "tools_and_tech",
                  "keywords", "action_verbs", "domain_terms",
                  "responsibilities", "seniority_signals", "hidden_expectations"):
            vals = jd.get(k) or []
            if vals:
                lines.append(f"**{k.replace('_', ' ').title()}**: {', '.join(vals)}")
    lines.append("\n## Gap Analysis")
    if gap:
        if "ats_match_percent" in gap:
            lines.append(f"**Current ATS match:** {gap['ats_match_percent']}%")
        missing = gap.get("missing_keywords") or []
        if missing:
            lines.append(f"**Missing keywords:** {', '.join(missing)}")
        metrics = gap.get("missing_metrics_areas") or []
        if metrics:
            lines.append(f"**Areas needing metrics:** {', '.join(metrics)}")
        irrelevant = gap.get("irrelevant_content") or []
        if irrelevant:
            lines.append(f"**Irrelevant content to cut:** {', '.join(irrelevant)}")
        risks = gap.get("formatting_risks") or []
        if risks:
            lines.append(f"**Formatting risks:** {', '.join(risks)}")
        weak = gap.get("weak_bullets") or []
        if weak:
            lines.append("\n**Weak bullets:**")
            for w in weak:
                lines.append(f"- Original: {w.get('original','')}")
                lines.append(f"  - Issue: {w.get('issue','')}")
                lines.append(f"  - Suggested: {w.get('suggested','')}")
        tops = gap.get("top_improvements") or []
        if tops:
            lines.append("\n**Top improvements:**")
            for t in tops:
                lines.append(f"- {t}")
    return "\n".join(lines)

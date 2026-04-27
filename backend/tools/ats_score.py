"""Composite ATS scorer — combines structure, parseability, keyword coverage, and LLM match.

Mirrors signals that real ATS (Workday, Greenhouse, Lever, Taleo) check:
  - Text extractability from the PDF
  - Standard section headers
  - Contact info presence (email, phone, LinkedIn)
  - Date consistency in experience
  - JD keyword coverage
  - Overall semantic match (LLM judgment)

Weights (tunable):
  LLM match            50
  Keyword coverage     25
  Structure            15
  Parseability         10
"""

import re
from typing import Any

from tools.xray import xray_resume, extract_jd_keywords
from tools.analyze_jd import gap_analysis
from tools.export import ats_preflight


SECTION_PATTERNS = {
    "summary":        r"\b(summary|profile|objective|about)\b",
    "experience":     r"\b(experience|employment|work history|professional experience)\b",
    "education":      r"\b(education|academic)\b",
    "skills":         r"\b(skills|technical skills|core competencies)\b",
    "projects":       r"\b(projects|selected projects)\b",
    "certifications": r"\b(certifications|licenses)\b",
}

EMAIL_RE    = r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}"
PHONE_RE    = r"(\+?\d[\d\s\-().]{7,}\d)"
LINKEDIN_RE = r"linkedin\.com/in/[A-Za-z0-9\-_]+"
DATE_RE     = r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}\b|\b\d{1,2}/\d{4}\b|\b\d{4}\s*[-–]\s*(?:\d{4}|present|current)\b"


def structure_score(resume_text: str) -> dict:
    text = (resume_text or "").lower()

    # Section headers present
    found = {k: bool(re.search(p, text, re.I)) for k, p in SECTION_PATTERNS.items()}
    required = ["experience", "education", "skills"]
    optional = ["summary", "projects", "certifications"]
    req_hits = sum(found[k] for k in required)
    opt_hits = sum(found[k] for k in optional)

    # Required sections worth more than optional
    section_score = (req_hits / len(required)) * 70 + (opt_hits / len(optional)) * 30

    # Contact info
    email_ok    = bool(re.search(EMAIL_RE, resume_text or ""))
    phone_ok    = bool(re.search(PHONE_RE, resume_text or ""))
    linkedin_ok = bool(re.search(LINKEDIN_RE, resume_text or "", re.I))
    contact_score = (email_ok * 45) + (phone_ok * 35) + (linkedin_ok * 20)

    # Date format presence (experience needs dates)
    dates_found = len(re.findall(DATE_RE, resume_text or "", re.I))
    date_score = min(100, dates_found * 20)

    total = round(section_score * 0.55 + contact_score * 0.30 + date_score * 0.15)

    return {
        "score": total,
        "sections_found": found,
        "contact": {"email": email_ok, "phone": phone_ok, "linkedin": linkedin_ok},
        "dates_found": dates_found,
        "issues": [
            *(f"Missing section: {k}" for k in required if not found[k]),
            *([] if email_ok    else ["No email detected"]),
            *([] if phone_ok    else ["No phone detected"]),
            *([] if linkedin_ok else ["No LinkedIn URL detected"]),
            *([] if dates_found >= 2 else ["Few or no dates detected in experience"]),
        ],
    }


def parseability_score(pdf_bytes: bytes | None) -> dict:
    if not pdf_bytes:
        return {"score": 80, "issues": ["No PDF provided — skipped parseability scan"]}
    preflight = ats_preflight(pdf_bytes)
    # Start at 100 and dock per issue
    score = 100
    score -= 10 * len(preflight.get("issues", []))
    if preflight.get("extractable_chars", 0) < 400:
        score -= 30
    score = max(0, min(100, score))
    return {
        "score": score,
        "page_count": preflight.get("page_count", 0),
        "extractable_chars": preflight.get("extractable_chars", 0),
        "issues": preflight.get("issues", []),
    }


def composite_ats_score(client, resume_text: str, jd_text: str,
                         pdf_bytes: bytes | None = None,
                         model: str = "") -> dict[str, Any]:
    """Compute all sub-scores and the weighted composite."""
    # 1. Structure (deterministic)
    struct = structure_score(resume_text)

    # 2. Parseability (deterministic)
    parse = parseability_score(pdf_bytes)

    # 3. Keyword coverage (deterministic, JD required)
    if jd_text:
        kw_list = extract_jd_keywords(jd_text)
        blob = (resume_text or "").lower()
        matched = [k for k in kw_list if k in blob]
        coverage = round(100 * len(matched) / max(1, len(kw_list)))
        keyword = {
            "score": coverage,
            "matched": matched,
            "missing": [k for k in kw_list if k not in blob],
            "total_keywords": len(kw_list),
        }
    else:
        keyword = {"score": 0, "matched": [], "missing": [], "total_keywords": 0,
                   "note": "No JD provided — keyword coverage skipped"}

    # 4. LLM match (subjective, JD required). If the LLM call fails or returns
    # a non-numeric score, fall back to a derived estimate based on keyword
    # coverage + structure so the composite stays meaningful.
    llm: dict[str, Any] = {"score": 0}
    if jd_text:
        fallback_score = round(keyword["score"] * 0.7 + struct["score"] * 0.3)
        try:
            gap = gap_analysis(client, resume_text, jd_text, model or "")
            raw_pct = gap.get("ats_match_percent")
            if raw_pct is None or raw_pct == 0:
                llm = {
                    "score": fallback_score,
                    "missing_keywords": gap.get("missing_keywords", []),
                    "weak_bullets": gap.get("weak_bullets", []),
                    "top_improvements": gap.get("top_improvements", []),
                    "fallback": True,
                    "note": "LLM returned no score — using keyword+structure estimate.",
                }
            else:
                llm = {
                    "score": max(0, min(100, int(raw_pct))),
                    "missing_keywords": gap.get("missing_keywords", []),
                    "weak_bullets": gap.get("weak_bullets", []),
                    "top_improvements": gap.get("top_improvements", []),
                }
        except Exception as e:
            llm = {
                "score": fallback_score,
                "error": str(e),
                "fallback": True,
                "note": f"LLM match unavailable ({type(e).__name__}) — using keyword+structure estimate.",
            }

    # Weighted composite — JD changes the weighting
    if jd_text:
        weights = {"llm": 0.50, "keyword": 0.25, "structure": 0.15, "parseability": 0.10}
        composite = round(
            llm["score"]       * weights["llm"] +
            keyword["score"]   * weights["keyword"] +
            struct["score"]    * weights["structure"] +
            parse["score"]     * weights["parseability"]
        )
    else:
        # No JD: structure + parseability only
        weights = {"structure": 0.60, "parseability": 0.40, "llm": 0, "keyword": 0}
        composite = round(struct["score"] * 0.60 + parse["score"] * 0.40)

    # Human-readable verdict
    if composite >= 80:
        verdict = "Ready to send"
    elif composite >= 65:
        verdict = "Strong match"
    elif composite >= 48:
        verdict = "Good progress"
    elif composite >= 35:
        verdict = "Needs work"
    else:
        verdict = "Major rewrite needed"

    # Aggregate issues, top first
    all_issues = []
    for src, obj in (("structure", struct), ("parseability", parse)):
        for i in obj.get("issues", []):
            all_issues.append({"source": src, "issue": i})
    if jd_text and keyword["missing"]:
        all_issues.append({
            "source": "keywords",
            "issue": f"Missing {len(keyword['missing'])} JD keywords (top: {', '.join(keyword['missing'][:8])})",
        })
    for i in llm.get("top_improvements", [])[:5]:
        all_issues.append({"source": "llm", "issue": i})

    return {
        "composite": composite,
        "verdict": verdict,
        "weights": weights,
        "breakdown": {
            "llm_match":    llm,
            "keyword":      keyword,
            "structure":    struct,
            "parseability": parse,
        },
        "issues": all_issues,
    }

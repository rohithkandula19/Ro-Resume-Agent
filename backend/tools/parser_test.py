"""Simulate what a real ATS parser sees in your resume.

This mirrors what Workday, Greenhouse, Lever, iCIMS, and Taleo actually do on
upload: dump PDF text, regex for contact info, detect sections by heading,
extract education/experience blocks by heuristic.

The goal is ground truth — not a score. The output shows exactly which fields
an ATS would populate from your resume so you can spot parse failures before
a recruiter does.
"""

from __future__ import annotations

import io
import re
from typing import Any

from pypdf import PdfReader


SECTION_HEADINGS = {
    "summary":       [r"\bsummary\b", r"\bprofile\b", r"\bobjective\b", r"\babout\b"],
    "experience":    [r"\bexperience\b", r"\bemployment\b", r"\bwork history\b", r"\bprofessional experience\b"],
    "education":     [r"\beducation\b", r"\bacademic\b"],
    "skills":        [r"\bskills\b", r"\btechnical skills\b", r"\bcore competencies\b", r"\btechnologies\b"],
    "projects":      [r"\bprojects\b", r"\bselected projects\b"],
    "certifications":[r"\bcertifications?\b", r"\blicenses?\b"],
    "awards":        [r"\bawards?\b", r"\bhonors\b", r"\bachievements\b"],
    "publications":  [r"\bpublications?\b"],
}

EMAIL_RE  = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE  = re.compile(r"(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}")
URL_RE    = re.compile(r"https?://[^\s,;)]+", re.IGNORECASE)
LINKEDIN_RE = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[A-Za-z0-9\-_/]+", re.IGNORECASE)
GITHUB_RE = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[A-Za-z0-9\-_/]+", re.IGNORECASE)
# Match year ranges: "2020-2023", "Jan 2020 - Present", "2020 – Present"
DATE_RANGE_RE = re.compile(
    r"(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?"
    r"(?:19|20)\d{2}"
    r"\s*[\-–—to]+\s*"
    r"(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?"
    r"(?:(?:19|20)\d{2}|Present|Current|Now)",
    re.IGNORECASE,
)


def extract_pdf_text(pdf_bytes: bytes) -> dict[str, Any]:
    """Run pypdf extraction — the same library stack most open-source ATS use."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages = []
    warnings: list[str] = []

    for i, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
            pages.append(text)
        except Exception as e:
            pages.append("")
            warnings.append(f"Page {i+1} extraction error: {e}")

    full = "\n".join(pages).strip()

    if not full:
        warnings.append("No text extracted — PDF may be image-only or use embedded (non-standard) fonts. ATS will see an empty document.")
    elif len(full) < 200:
        warnings.append(f"Only {len(full)} characters extracted — ATS may see a mostly empty resume.")

    # Detect garbled text (common sign of font encoding issues)
    non_ascii_ratio = sum(1 for c in full if ord(c) > 127) / max(1, len(full))
    if non_ascii_ratio > 0.25:
        warnings.append("High ratio of non-ASCII characters detected — font encoding may be garbled in some ATS.")

    # Detect multi-column layout (a cause of jumbled text order)
    # Heuristic: if many lines are very short AND the doc has lots of whitespace runs, likely columns
    lines = [l for l in full.splitlines() if l.strip()]
    short_lines = sum(1 for l in lines if len(l.strip()) < 30)
    if lines and short_lines / len(lines) > 0.5 and len(lines) > 20:
        warnings.append("Many short lines detected — document may use columns/sidebar that scrambles reading order in some ATS.")

    return {
        "full_text": full,
        "pages": len(pages),
        "chars": len(full),
        "lines": len(lines),
        "warnings": warnings,
    }


def detect_sections(text: str) -> dict[str, Any]:
    """Find which section headings are present and which are missing."""
    lower = text.lower()
    found: dict[str, dict[str, Any]] = {}
    for section, patterns in SECTION_HEADINGS.items():
        for pat in patterns:
            m = re.search(pat, lower)
            if m:
                found[section] = {
                    "heading_match": m.group(0),
                    "position": m.start(),
                }
                break

    missing = [s for s in SECTION_HEADINGS if s not in found and s not in ("awards", "publications")]

    return {
        "found": found,
        "missing_critical": missing,
    }


def extract_contact(text: str) -> dict[str, Any]:
    """Pull email, phone, LinkedIn, GitHub from the top of the resume."""
    first_page = text[:2000]

    email_m = EMAIL_RE.search(first_page)
    phone_m = PHONE_RE.search(first_page)
    linkedin_m = LINKEDIN_RE.search(text)
    github_m = GITHUB_RE.search(text)

    name = ""
    for line in (first_page.splitlines())[:10]:
        line = line.strip()
        if not line:
            continue
        # First non-empty line with 2-4 words and no digits/special chars is likely the name
        words = line.split()
        if 2 <= len(words) <= 4 and not any(c.isdigit() for c in line) and "@" not in line and len(line) < 60:
            name = line
            break

    return {
        "name": name,
        "email": email_m.group(0) if email_m else None,
        "phone": phone_m.group(0) if phone_m else None,
        "linkedin": linkedin_m.group(0) if linkedin_m else None,
        "github": github_m.group(0) if github_m else None,
    }


def extract_experience_blocks(text: str, sections: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract (org, dates) pairs from the experience section as a sanity check."""
    exp_info = sections["found"].get("experience")
    edu_info = sections["found"].get("education")
    proj_info = sections["found"].get("projects")
    if not exp_info:
        return []

    start = exp_info["position"]
    end_candidates = [pos for pos in [
        edu_info["position"] if edu_info else None,
        proj_info["position"] if proj_info else None,
    ] if pos is not None and pos > start]
    end = min(end_candidates) if end_candidates else len(text)

    exp_text = text[start:end]
    blocks = []
    for m in DATE_RANGE_RE.finditer(exp_text):
        # Capture 80 chars before the date as likely org/title context
        ctx_start = max(0, m.start() - 80)
        context = exp_text[ctx_start:m.start()].strip().split("\n")[-1].strip()
        blocks.append({
            "dates": m.group(0),
            "context": context[:100] if context else "(no context found)",
        })
    return blocks


def parser_test_pdf(pdf_bytes: bytes) -> dict[str, Any]:
    """Main entry: run all extraction passes and report what an ATS sees."""
    extraction = extract_pdf_text(pdf_bytes)
    text = extraction["full_text"]
    sections = detect_sections(text)
    contact = extract_contact(text)
    experience = extract_experience_blocks(text, sections)

    scorecard = {
        "text_extractable": bool(text),
        "name_parsed": bool(contact["name"]),
        "email_parsed": bool(contact["email"]),
        "phone_parsed": bool(contact["phone"]),
        "experience_section_found": "experience" in sections["found"],
        "education_section_found": "education" in sections["found"],
        "skills_section_found": "skills" in sections["found"],
        "experience_blocks_detected": len(experience),
    }
    passed = sum(1 for v in scorecard.values() if v is True or (isinstance(v, int) and v > 0))
    total = len(scorecard)

    return {
        "extraction": {
            "chars": extraction["chars"],
            "lines": extraction["lines"],
            "pages": extraction["pages"],
            "preview": text[:1500],
        },
        "warnings": extraction["warnings"],
        "sections": sections,
        "contact": contact,
        "experience_blocks": experience,
        "scorecard": scorecard,
        "parse_quality_percent": round(100 * passed / total),
    }

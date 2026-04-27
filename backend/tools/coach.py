"""Coach — red flags, seniority calibration, cert recommender, salary band, impact coach."""

import json
import re

from agent import chat, model_primary
from library.action_verbs import WEAK_PHRASES


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


def red_flags(resume_text: str) -> dict:
    """Heuristic red-flag scan — weak phrases, passive voice, pronouns."""
    text = resume_text or ""
    weak_hits = []
    for phrase in WEAK_PHRASES:
        if re.search(rf"\b{re.escape(phrase)}\b", text, re.IGNORECASE):
            weak_hits.append(phrase)

    pronouns = re.findall(r"\b(I|me|my|we|our|us)\b", text)
    passive = re.findall(r"\b(was|were|been|being)\s+\w+ed\b", text, re.IGNORECASE)

    return {
        "weak_phrases": weak_hits,
        "pronoun_count": len(pronouns),
        "passive_voice_count": len(passive),
        "issues": [
            *(f"Weak phrase: '{w}'" for w in weak_hits),
            *([f"{len(pronouns)} pronouns found (avoid in resumes)"] if pronouns else []),
            *([f"{len(passive)} passive constructions (prefer active voice)"] if passive else []),
        ],
    }


def seniority_calibrate(client, resume_text: str, target_level: str) -> dict:
    """Assess whether tone/scope matches target level (e.g., Staff, Senior, Director, VP)."""
    system = (
        "You assess whether a resume's tone, scope, and language match a target seniority. "
        "Return VALID JSON only: "
        "{current_level_estimate:string, target_level:string, match:string, "
        "scope_gap:string, tone_gap:string, rewrite_examples:[{original:string, suggested:string}]}. "
        "match values: 'aligned' | 'under' | 'over'. No prose outside JSON."
    )
    user = f"TARGET LEVEL: {target_level}\n\nRESUME:\n{resume_text}"
    raw = chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=model_primary(), temperature=0.3, max_tokens=1500,
    )
    return _parse_json(raw)


def cert_recommender(client, role: str, gaps: list[str]) -> dict:
    """Suggest certifications to close gaps."""
    system = (
        "Given a target role and a list of skill gaps, suggest certifications. "
        "Return VALID JSON only: "
        "{recommendations:[{name:string, provider:string, effort_hours:int, why:string, priority:string}]}. "
        "priority: 'high' | 'medium' | 'low'. No prose."
    )
    user = f"ROLE: {role}\nGAPS: {gaps}"
    raw = chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=model_primary(), temperature=0.3, max_tokens=900,
    )
    return _parse_json(raw)


CURRENCY_SYMBOLS = {
    "USD": "$",   "EUR": "€",   "GBP": "£",   "JPY": "¥",   "CNY": "¥",
    "INR": "₹",   "KRW": "₩",   "RUB": "₽",   "TRY": "₺",   "ILS": "₪",
    "CAD": "C$",  "AUD": "A$",  "NZD": "NZ$", "SGD": "S$",  "HKD": "HK$",
    "TWD": "NT$", "BRL": "R$",  "MXN": "MX$", "ZAR": "R",
}


def salary_band(client, role: str, years: int, location: str, resume_text: str) -> dict:
    system = (
        "Estimate a realistic annual base-salary band in the LOCAL CURRENCY of the given LOCATION. "
        "Return VALID JSON only: "
        "{low:int, mid:int, high:int, currency:string, currency_symbol:string, "
        "basis:string, caveats:[string]}. "
        "\n\n"
        "CURRENCY: Use whatever currency is actually paid in the given country — "
        "do NOT default to USD unless the location is the United States or unspecified. "
        "Use the ISO-4217 3-letter code: "
        "US→USD, UK→GBP, India→INR, Eurozone countries (Germany, France, Spain, Italy, Netherlands, Ireland, Portugal, Greece, Finland, Austria, Belgium, etc.)→EUR, "
        "Canada→CAD, Australia→AUD, New Zealand→NZD, Japan→JPY, China→CNY, South Korea→KRW, "
        "Singapore→SGD, Hong Kong→HKD, Taiwan→TWD, Malaysia→MYR, Thailand→THB, Indonesia→IDR, Philippines→PHP, Vietnam→VND, "
        "UAE→AED, Saudi Arabia→SAR, Qatar→QAR, Israel→ILS, Turkey→TRY, "
        "Switzerland→CHF, Norway→NOK, Sweden→SEK, Denmark→DKK, Poland→PLN, Czech→CZK, Hungary→HUF, "
        "Brazil→BRL, Mexico→MXN, Argentina→ARS, Chile→CLP, Colombia→COP, "
        "South Africa→ZAR, Nigeria→NGN, Egypt→EGP, Kenya→KES, "
        "Russia→RUB, Ukraine→UAH. "
        "For any country not listed, use that country's official ISO-4217 currency code. "
        "\n\n"
        "MAGNITUDE: Use the native convention of each market. "
        "India SWE: 0 YOE ~₹3–8 LPA, 2–4 YOE ~₹10–25 LPA, 5–8 YOE ~₹25–60 LPA, 10+ YOE ~₹60–150+ LPA. "
        "US SWE: new-grad ~$70k–$130k, mid ~$130k–$200k, senior ~$180k–$300k base. "
        "UK SWE: new-grad ~£30k–£55k, mid ~£55k–£90k, senior ~£90k–£160k. "
        "Germany SWE: new-grad ~€45k–€65k, mid ~€65k–€95k, senior ~€95k–€140k. "
        "Canada SWE: new-grad ~C$70k–C$95k, mid ~C$100k–C$150k, senior ~C$150k–C$230k. "
        "Australia SWE: new-grad ~A$75k–A$100k, mid ~A$110k–A$160k, senior ~A$160k–A$250k. "
        "Singapore SWE: new-grad ~S$60k–S$90k, mid ~S$90k–S$150k, senior ~S$150k–S$250k. "
        "Japan SWE: new-grad ~¥4M–¥6M, mid ~¥7M–¥12M, senior ~¥13M–¥25M. "
        "Scale these ranges up/down based on role seniority, company tier, and city premium (SF/NY/London/Tokyo/Zurich skew high; tier-2 cities lower). "
        "For 0 YOE, always use entry-level/fresher bands — never senior numbers. "
        "Be conservative. No prose."
    )
    user = f"ROLE: {role}\nYEARS: {years}\nLOCATION: {location}\nRESUME:\n{resume_text}"
    raw = chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=model_primary(), temperature=0.2, max_tokens=500,
    )
    data = _parse_json(raw)
    if isinstance(data, dict):
        # Back-compat: some models still emit low_usd/mid_usd/high_usd.
        data.setdefault("low",  data.get("low_usd"))
        data.setdefault("mid",  data.get("mid_usd"))
        data.setdefault("high", data.get("high_usd"))
        cur = (data.get("currency") or "USD").upper()
        data["currency"] = cur
        data.setdefault("currency_symbol", CURRENCY_SYMBOLS.get(cur, cur + " "))
    return data


def impact_coach(client, bullet: str, role_context: str) -> dict:
    """Prompt user with specific questions to strengthen one bullet."""
    system = (
        "You are an impact coach. Given one resume bullet, identify missing impact "
        "and ask 3 specific questions the user could answer to strengthen it. "
        "Return VALID JSON only: "
        "{questions:[string], suggested_rewrite_template:string}. No prose."
    )
    user = f"BULLET: {bullet}\nROLE: {role_context}"
    raw = chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=model_primary(), temperature=0.4, max_tokens=500,
    )
    return _parse_json(raw)

"""Font library across five tiers with ATS-safety metadata and a selection helper."""

FONTS = {
    # Tier 1 — ATS-Safe Core (universal, always safe)
    "Arial":            {"tier": 1, "ats_safe": True,  "style": "sans",  "use": ["ats", "general"]},
    "Calibri":          {"tier": 1, "ats_safe": True,  "style": "sans",  "use": ["ats", "general"]},
    "Times New Roman":  {"tier": 1, "ats_safe": True,  "style": "serif", "use": ["ats", "formal"]},
    "Helvetica":        {"tier": 1, "ats_safe": True,  "style": "sans",  "use": ["ats", "modern"]},
    "Verdana":          {"tier": 1, "ats_safe": True,  "style": "sans",  "use": ["ats"]},
    "Georgia":          {"tier": 1, "ats_safe": True,  "style": "serif", "use": ["ats", "readable"]},
    "Tahoma":           {"tier": 1, "ats_safe": True,  "style": "sans",  "use": ["ats"]},
    "Cambria":          {"tier": 1, "ats_safe": True,  "style": "serif", "use": ["ats", "formal"]},
    "Garamond":         {"tier": 1, "ats_safe": True,  "style": "serif", "use": ["formal", "executive"]},
    "Book Antiqua":     {"tier": 1, "ats_safe": True,  "style": "serif", "use": ["formal"]},

    # Tier 2 — Modern ATS-Friendly
    "Lato":             {"tier": 2, "ats_safe": True,  "style": "sans", "use": ["modern", "balanced"]},
    "Open Sans":        {"tier": 2, "ats_safe": True,  "style": "sans", "use": ["modern", "fresher"]},
    "Roboto":           {"tier": 2, "ats_safe": True,  "style": "sans", "use": ["modern", "tech"]},
    "Source Sans Pro":  {"tier": 2, "ats_safe": True,  "style": "sans", "use": ["modern", "balanced"]},
    "Noto Sans":        {"tier": 2, "ats_safe": True,  "style": "sans", "use": ["modern", "international"]},
    "IBM Plex Sans":    {"tier": 2, "ats_safe": True,  "style": "sans", "use": ["modern", "tech"]},
    "Inter":            {"tier": 2, "ats_safe": True,  "style": "sans", "use": ["modern", "tech"]},
    "Nunito Sans":      {"tier": 2, "ats_safe": True,  "style": "sans", "use": ["modern"]},
    "PT Sans":          {"tier": 2, "ats_safe": True,  "style": "sans", "use": ["modern"]},
    "Work Sans":        {"tier": 2, "ats_safe": True,  "style": "sans", "use": ["modern", "product"]},

    # Tier 3 — Premium / Executive
    "EB Garamond":        {"tier": 3, "ats_safe": True,  "style": "serif", "use": ["executive", "premium"]},
    "Merriweather":       {"tier": 3, "ats_safe": True,  "style": "serif", "use": ["executive", "readable"]},
    "Playfair Display":   {"tier": 3, "ats_safe": False, "style": "serif", "use": ["headings", "creative"]},
    "Lora":               {"tier": 3, "ats_safe": True,  "style": "serif", "use": ["executive", "balanced"]},
    "Cormorant Garamond": {"tier": 3, "ats_safe": False, "style": "serif", "use": ["premium"]},
    "Crimson Text":       {"tier": 3, "ats_safe": True,  "style": "serif", "use": ["premium", "academic"]},
    "Libre Baskerville":  {"tier": 3, "ats_safe": True,  "style": "serif", "use": ["premium"]},

    # Tier 4 — Tech / Modern Minimal
    "IBM Plex Mono":    {"tier": 4, "ats_safe": False, "style": "mono", "use": ["accent", "tech"]},
    "JetBrains Mono":   {"tier": 4, "ats_safe": False, "style": "mono", "use": ["accent", "tech"]},
    "Fira Sans":        {"tier": 4, "ats_safe": True,  "style": "sans", "use": ["tech", "modern"]},
    "Manrope":          {"tier": 4, "ats_safe": True,  "style": "sans", "use": ["tech", "startup"]},
    "DM Sans":          {"tier": 4, "ats_safe": True,  "style": "sans", "use": ["tech", "product"]},
    "Space Grotesk":    {"tier": 4, "ats_safe": False, "style": "sans", "use": ["tech", "creative"]},

    # Tier 5 — Creative (styled version only)
    "Poppins":    {"tier": 5, "ats_safe": False, "style": "sans", "use": ["creative", "marketing"]},
    "Montserrat": {"tier": 5, "ats_safe": False, "style": "sans", "use": ["creative", "designer"]},
    "Raleway":    {"tier": 5, "ats_safe": False, "style": "sans", "use": ["creative", "designer"]},
    "Quicksand":  {"tier": 5, "ats_safe": False, "style": "sans", "use": ["creative"]},
    "Barlow":     {"tier": 5, "ats_safe": True,  "style": "sans", "use": ["creative", "marketing"]},
    "Karla":      {"tier": 5, "ats_safe": True,  "style": "sans", "use": ["creative"]},
}

AVOID = [
    "Comic Sans", "Papyrus", "Brush Script", "Impact",
    "Courier New (body)", "decorative display fonts",
]

ATS_FALLBACK = "Calibri"


def ats_safe_fonts():
    return [name for name, meta in FONTS.items() if meta["ats_safe"]]


def fonts_by_use(use_case: str):
    return [name for name, meta in FONTS.items() if use_case in meta["use"]]


def recommend_font(role: str, style_pref: str) -> str:
    role = (role or "").lower()
    style_pref = (style_pref or "").lower()

    if "design" in role or "creative" in style_pref:
        return "Poppins"
    if "executive" in style_pref or "senior" in role or "director" in role or "vp" in role:
        return "EB Garamond"
    if "finance" in role or "legal" in role or "law" in role:
        return "Garamond"
    if "engineer" in role or "developer" in role or "tech" in role or "modern" in style_pref:
        return "Inter"
    if "product" in role:
        return "DM Sans"
    if "marketing" in role:
        return "Barlow"
    if "minimal" in style_pref or "ats" in style_pref:
        return "Calibri"
    return "Lato"


def fallback_for_ats(font: str) -> str:
    meta = FONTS.get(font)
    if meta and meta["ats_safe"]:
        return font
    return ATS_FALLBACK


def font_catalog_markdown() -> str:
    lines = ["## Font Library"]
    tiers = {
        1: "Tier 1 — ATS-Safe Core",
        2: "Tier 2 — Modern ATS-Friendly",
        3: "Tier 3 — Premium / Executive",
        4: "Tier 4 — Tech / Modern Minimal",
        5: "Tier 5 — Creative",
    }
    for tier, title in tiers.items():
        lines.append(f"\n### {title}")
        for name, meta in FONTS.items():
            if meta["tier"] == tier:
                flag = "ATS" if meta["ats_safe"] else "Styled only"
                lines.append(f"- {name} ({meta['style']}, {flag})")
    lines.append("\n### Avoid")
    for a in AVOID:
        lines.append(f"- {a}")
    return "\n".join(lines)

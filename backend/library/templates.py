"""FAANG + global + role-specific resume template library.

Each template declares: category, best_for, style, ats_score (High/Med/Low),
recommended fonts, pages, notes. Used by the agent to suggest 3-5 options.
"""

TEMPLATES = [
    # ---------------- FAANG & Big Tech ----------------
    {
        "id": "google_xyz",
        "name": "Google XYZ Format",
        "category": "FAANG",
        "best_for": ["SWE", "Engineer", "PM", "Data"],
        "style": "minimal",
        "ats_score": "High",
        "fonts": ["Arial", "Calibri"],
        "pages": "1 (<10 yrs) / 2 (senior)",
        "notes": "Every bullet follows 'Accomplished [X] as measured by [Y] by doing [Z]'. Metrics in every line.",
    },
    {
        "id": "meta_engineering",
        "name": "Meta Engineering Resume",
        "category": "FAANG",
        "best_for": ["SWE", "ML", "Infra"],
        "style": "minimal",
        "ats_score": "High",
        "fonts": ["Helvetica", "Arial"],
        "pages": "1",
        "notes": "Impact-first, metrics in every bullet, tight vertical rhythm.",
    },
    {
        "id": "amazon_lp",
        "name": "Amazon Leadership Principles Resume",
        "category": "FAANG",
        "best_for": ["SWE", "PM", "TPM", "Ops"],
        "style": "minimal",
        "ats_score": "High",
        "fonts": ["Calibri", "Arial"],
        "pages": "1-2",
        "notes": "Bullets mapped to the 16 Amazon LPs, STAR format, ownership language.",
    },
    {
        "id": "apple_minimal",
        "name": "Apple Minimal Resume",
        "category": "FAANG",
        "best_for": ["Designer", "SWE", "PM"],
        "style": "minimal",
        "ats_score": "High",
        "fonts": ["Helvetica", "Inter"],
        "pages": "1",
        "notes": "Whitespace-heavy, SF Pro feel (Helvetica fallback), zero visual noise.",
    },
    {
        "id": "netflix_senior_ic",
        "name": "Netflix Senior IC Resume",
        "category": "FAANG",
        "best_for": ["Senior Engineer", "Staff", "Principal"],
        "style": "minimal",
        "ats_score": "High",
        "fonts": ["Helvetica", "Arial"],
        "pages": "1-2",
        "notes": "Narrative summary + high-impact bullets. Scope and leverage emphasized.",
    },
    {
        "id": "microsoft_modern",
        "name": "Microsoft Modern Resume",
        "category": "FAANG",
        "best_for": ["SWE", "PM", "Cloud"],
        "style": "modern",
        "ats_score": "High",
        "fonts": ["Calibri", "Segoe-like (Open Sans)"],
        "pages": "1-2",
        "notes": "Balanced structure, growth-mindset framing, clean section hierarchy.",
    },

    # ---------------- Top Tech / Unicorns ----------------
    {
        "id": "stripe_eng",
        "name": "Stripe Engineering Resume",
        "category": "Top Tech",
        "best_for": ["Backend", "Payments", "Infra"],
        "style": "modern",
        "ats_score": "High",
        "fonts": ["Inter", "IBM Plex Sans"],
        "pages": "1",
        "notes": "Dense technical depth, systems + scale + reliability wording.",
    },
    {
        "id": "airbnb_design",
        "name": "Airbnb Design-Forward Resume",
        "category": "Top Tech",
        "best_for": ["Designer", "Frontend", "UX"],
        "style": "modern",
        "ats_score": "Medium",
        "fonts": ["Inter", "DM Sans"],
        "pages": "1",
        "notes": "Subtle accent color, Cereal-inspired spacing, tasteful visual hierarchy.",
    },
    {
        "id": "uber_pm",
        "name": "Uber PM Resume",
        "category": "Top Tech",
        "best_for": ["PM", "Growth"],
        "style": "modern",
        "ats_score": "High",
        "fonts": ["DM Sans", "Inter"],
        "pages": "1",
        "notes": "Metrics + scale ('impacted N million users'), cross-functional leadership.",
    },
    {
        "id": "linkedin_recruiter",
        "name": "LinkedIn Recruiter-Optimized",
        "category": "Top Tech",
        "best_for": ["Any"],
        "style": "balanced",
        "ats_score": "High",
        "fonts": ["Source Sans Pro", "Lato"],
        "pages": "1-2",
        "notes": "Keyword-dense, mirrors LinkedIn profile structure, search-friendly.",
    },
    {
        "id": "shopify_commerce",
        "name": "Shopify Commerce Resume",
        "category": "Top Tech",
        "best_for": ["SWE", "PM", "Growth"],
        "style": "modern",
        "ats_score": "High",
        "fonts": ["Work Sans", "Inter"],
        "pages": "1",
        "notes": "Product + growth metrics, merchant-outcome framing.",
    },

    # ---------------- Consulting & Finance ----------------
    {
        "id": "mckinsey_consulting",
        "name": "McKinsey Consulting Resume",
        "category": "Consulting",
        "best_for": ["Consultant", "Strategy"],
        "style": "premium",
        "ats_score": "High",
        "fonts": ["Garamond", "EB Garamond"],
        "pages": "1",
        "notes": "Structured, achievement-led, clear client impact and scope.",
    },
    {
        "id": "bcg_bain",
        "name": "BCG / Bain Format",
        "category": "Consulting",
        "best_for": ["Consultant"],
        "style": "premium",
        "ats_score": "High",
        "fonts": ["Garamond", "Times New Roman"],
        "pages": "1",
        "notes": "Tight one-pager, results-first bullets, conservative layout.",
    },
    {
        "id": "goldman_ib",
        "name": "Goldman Sachs IB Resume",
        "category": "Finance",
        "best_for": ["IB", "Analyst"],
        "style": "premium",
        "ats_score": "High",
        "fonts": ["Times New Roman", "Cambria"],
        "pages": "1",
        "notes": "Deal-sheet style, transactions with size/scope, formal tone.",
    },
    {
        "id": "big4",
        "name": "Big 4 Audit / Consulting",
        "category": "Consulting",
        "best_for": ["Audit", "Tax", "Consulting"],
        "style": "premium",
        "ats_score": "High",
        "fonts": ["Calibri", "Cambria"],
        "pages": "1-2",
        "notes": "Formal, certification-forward, client + engagement outcomes.",
    },

    # ---------------- Global / Regional ----------------
    {
        "id": "us_standard",
        "name": "US Standard Resume",
        "category": "Global",
        "best_for": ["Any"],
        "style": "minimal",
        "ats_score": "High",
        "fonts": ["Arial", "Calibri"],
        "pages": "1",
        "notes": "No photo, no DOB, reverse chronological. Default for US roles.",
    },
    {
        "id": "europass",
        "name": "Europass (EU) Resume",
        "category": "Global",
        "best_for": ["EU roles"],
        "style": "structured",
        "ats_score": "High",
        "fonts": ["Arial", "Verdana"],
        "pages": "1-2",
        "notes": "Structured EU format, language proficiency + digital skills sections.",
    },
    {
        "id": "uk_cv",
        "name": "UK CV",
        "category": "Global",
        "best_for": ["UK roles"],
        "style": "balanced",
        "ats_score": "High",
        "fonts": ["Calibri", "Arial"],
        "pages": "2",
        "notes": "Slightly more detail than US. Personal statement + full work history.",
    },
    {
        "id": "dach_lebenslauf",
        "name": "Germany / DACH Lebenslauf",
        "category": "Global",
        "best_for": ["DE/AT/CH roles"],
        "style": "formal",
        "ats_score": "High",
        "fonts": ["Cambria", "Arial"],
        "pages": "1-2",
        "notes": "Photo + DOB expected, tabular format, signed + dated.",
    },
    {
        "id": "india_standard",
        "name": "India Standard Resume",
        "category": "Global",
        "best_for": ["India roles"],
        "style": "balanced",
        "ats_score": "High",
        "fonts": ["Calibri", "Arial"],
        "pages": "2",
        "notes": "Objective + detailed projects, academic percentages, certifications.",
    },
    {
        "id": "japan_rirekisho",
        "name": "Japan Rirekisho",
        "category": "Global",
        "best_for": ["Japan roles"],
        "style": "formal",
        "ats_score": "Medium",
        "fonts": ["Noto Sans", "Arial"],
        "pages": "2",
        "notes": "Formal Japanese CV format with photo, handwritten tradition aside.",
    },
    {
        "id": "middle_east",
        "name": "Middle East Resume",
        "category": "Global",
        "best_for": ["GCC roles"],
        "style": "balanced",
        "ats_score": "High",
        "fonts": ["Arial", "Calibri"],
        "pages": "2",
        "notes": "Photo + personal details commonly included. Nationality expected.",
    },

    # ---------------- Balanced / Hybrid ----------------
    {
        "id": "balanced_hybrid",
        "name": "Balanced Hybrid",
        "category": "Balanced",
        "best_for": ["Any"],
        "style": "balanced",
        "ats_score": "High",
        "fonts": ["Lato", "Source Sans Pro"],
        "pages": "1-2",
        "notes": "Single column, light styling, ATS-parses cleanly, still visually polished.",
    },
    {
        "id": "two_column_safe",
        "name": "Two-Column Safe",
        "category": "Balanced",
        "best_for": ["Senior", "Skill-heavy"],
        "style": "modern",
        "ats_score": "Medium",
        "fonts": ["Lato", "Inter"],
        "pages": "1",
        "notes": "ATS-tested column layout (not sidebar-graphic heavy). Use only if confirmed parser-safe.",
    },
    {
        "id": "modern_classic",
        "name": "Modern Classic",
        "category": "Balanced",
        "best_for": ["Any"],
        "style": "balanced",
        "ats_score": "High",
        "fonts": ["Source Sans Pro", "Georgia"],
        "pages": "1-2",
        "notes": "Clean hierarchy, serif-sans pairing, recruiter-friendly.",
    },

    # ---------------- Creative ----------------
    {
        "id": "creative_modern",
        "name": "Creative Modern",
        "category": "Creative",
        "best_for": ["Designer", "Marketing", "Brand"],
        "style": "creative",
        "ats_score": "Low",
        "fonts": ["Poppins", "Montserrat"],
        "pages": "1-2",
        "notes": "Accent color blocks, modern type pairing. Pair with ATS-safe version.",
    },
    {
        "id": "designer_portfolio",
        "name": "Designer Portfolio Resume",
        "category": "Creative",
        "best_for": ["UX", "UI", "Product Designer"],
        "style": "creative",
        "ats_score": "Low",
        "fonts": ["Raleway", "Montserrat"],
        "pages": "1",
        "notes": "Visual hierarchy, portfolio link prominent, case-study-style bullets.",
    },
    {
        "id": "marketing_bold",
        "name": "Marketing Bold",
        "category": "Creative",
        "best_for": ["Marketing", "Growth", "Brand"],
        "style": "creative",
        "ats_score": "Medium",
        "fonts": ["Barlow", "Karla"],
        "pages": "1",
        "notes": "Campaign-style headings, metrics-forward, confident tone.",
    },

    # ---------------- Specialized ----------------
    {
        "id": "academic_cv",
        "name": "Academic / Research CV",
        "category": "Specialized",
        "best_for": ["Academic", "Research", "PhD"],
        "style": "formal",
        "ats_score": "High",
        "fonts": ["Merriweather", "EB Garamond"],
        "pages": "3+",
        "notes": "Publications, grants, teaching, references. Multi-page expected.",
    },
    {
        "id": "career_change",
        "name": "Career Change Resume",
        "category": "Specialized",
        "best_for": ["Switchers"],
        "style": "balanced",
        "ats_score": "High",
        "fonts": ["Calibri", "Lato"],
        "pages": "1",
        "notes": "Skills-first structure, transferable skills, targeted summary.",
    },
    {
        "id": "fresher_student",
        "name": "Fresher / Student Resume",
        "category": "Specialized",
        "best_for": ["Student", "New Grad", "Intern"],
        "style": "balanced",
        "ats_score": "High",
        "fonts": ["Open Sans", "Calibri"],
        "pages": "1",
        "notes": "Projects + education forward, coursework, internships, GPA if strong.",
    },
    {
        "id": "international_global",
        "name": "International / Global",
        "category": "Specialized",
        "best_for": ["Multi-region"],
        "style": "minimal",
        "ats_score": "High",
        "fonts": ["Noto Sans", "Arial"],
        "pages": "1-2",
        "notes": "Multilingual-safe font, neutral format that travels across regions.",
    },

    # ---------------- Role-Specific Compact ----------------
    {
        "id": "swe_backend",
        "name": "SWE / Backend Focus",
        "category": "Role",
        "best_for": ["Backend", "Distributed Systems"],
        "style": "minimal",
        "ats_score": "High",
        "fonts": ["Inter", "IBM Plex Sans"],
        "pages": "1",
        "notes": "Google XYZ bullets, latency/throughput/scale metrics, systems language.",
    },
    {
        "id": "frontend_ui",
        "name": "Frontend / UI Engineer",
        "category": "Role",
        "best_for": ["Frontend", "Fullstack"],
        "style": "modern",
        "ats_score": "High",
        "fonts": ["Inter", "DM Sans"],
        "pages": "1",
        "notes": "Subtle polish, product outcomes, a11y and perf wins called out.",
    },
    {
        "id": "data_ml",
        "name": "Data Scientist / ML",
        "category": "Role",
        "best_for": ["DS", "ML", "Research"],
        "style": "balanced",
        "ats_score": "High",
        "fonts": ["Lato", "Merriweather"],
        "pages": "1-2",
        "notes": "Projects + publications forward, model metrics (AUC, F1, lift).",
    },
    {
        "id": "pm_modern",
        "name": "Product Manager (Modern)",
        "category": "Role",
        "best_for": ["PM", "APM", "Sr PM"],
        "style": "modern",
        "ats_score": "High",
        "fonts": ["DM Sans", "Inter"],
        "pages": "1",
        "notes": "Metrics + scope of influence, cross-functional leadership signals.",
    },
    {
        "id": "devops_sre",
        "name": "DevOps / SRE",
        "category": "Role",
        "best_for": ["DevOps", "SRE", "Platform"],
        "style": "minimal",
        "ats_score": "High",
        "fonts": ["Inter", "Fira Sans"],
        "pages": "1",
        "notes": "Tools + scale + incident impact, MTTR, SLOs, reliability wins.",
    },
    {
        "id": "ro_signature",
        "name": "RO Signature",
        "category": "Classic",
        "best_for": ["AI/ML", "Engineer", "SWE", "Data", "MLOps", "Generative AI"],
        "style": "classic",
        "ats_score": "High",
        "fonts": ["Calibri", "Arial", "Georgia", "Times New Roman"],
        "pages": "1-2",
        "notes": "Centered bold name, italic subtitle, full-width rule, gray-shaded section headers, dot bullets. Clean, professional, ATS-safe. Based on a real ML engineer resume.",
    },
    {
        "id": "sales_bd",
        "name": "Sales / BD",
        "category": "Role",
        "best_for": ["AE", "SDR", "BD"],
        "style": "balanced",
        "ats_score": "High",
        "fonts": ["Calibri", "Lato"],
        "pages": "1-2",
        "notes": "Quota attainment, revenue impact, pipeline and deal-size metrics.",
    },

    # ---------------- City Series (inspired by global design styles) ----------------
    {
        "id": "dublin_classic",
        "name": "Dublin Classic",
        "category": "City Series",
        "best_for": ["Engineer", "Finance", "Analyst", "Consultant"],
        "style": "classic",
        "ats_score": "High",
        "fonts": ["Georgia", "Garamond", "Times New Roman"],
        "pages": "1-2",
        "notes": "Traditional serif, teal accent rule under name, single-column, section dividers. Timeless professional feel — strong for EU and UK markets.",
    },
    {
        "id": "sydney_modern",
        "name": "Sydney Modern",
        "category": "City Series",
        "best_for": ["PM", "Operations", "Marketing", "Business"],
        "style": "modern",
        "ats_score": "High",
        "fonts": ["Inter", "Open Sans", "Lato"],
        "pages": "1",
        "notes": "Clean two-column split: navy left sidebar for contact/skills, white body for experience. Strong visual hierarchy, crisp and contemporary.",
    },
    {
        "id": "paris_elegant",
        "name": "Paris Elegant",
        "category": "City Series",
        "best_for": ["Designer", "Marketing", "PR", "Creative"],
        "style": "creative",
        "ats_score": "Medium",
        "fonts": ["Cormorant Garamond", "Playfair Display", "EB Garamond"],
        "pages": "1",
        "notes": "Sophisticated serif with burgundy accent, centered name in caps, hairline rules, generous whitespace. Designed to impress creative directors.",
    },
    {
        "id": "chicago_bold",
        "name": "Chicago Bold",
        "category": "City Series",
        "best_for": ["Operations", "Healthcare", "Nonprofit", "Education"],
        "style": "modern",
        "ats_score": "High",
        "fonts": ["Work Sans", "Source Sans 3", "Nunito Sans"],
        "pages": "1-2",
        "notes": "Strong typographic weight, dark slate headers, clean bullet layout. Confidence and clarity — built for competitive markets.",
    },
    {
        "id": "toronto_professional",
        "name": "Toronto Professional",
        "category": "City Series",
        "best_for": ["Finance", "Law", "Healthcare", "Engineering"],
        "style": "minimal",
        "ats_score": "High",
        "fonts": ["Calibri", "Arial", "Open Sans"],
        "pages": "1-2",
        "notes": "Balanced and polished — indigo-blue accent bar, full-width name header, structured body. Versatile across North American industries.",
    },
    {
        "id": "milan_executive",
        "name": "Milan Executive",
        "category": "City Series",
        "best_for": ["C-Suite", "VP", "Director", "Executive"],
        "style": "premium",
        "ats_score": "High",
        "fonts": ["Cormorant Garamond", "Merriweather", "Playfair Display"],
        "pages": "1-2",
        "notes": "Executive-grade serif with charcoal-gold accent, centered layout, compressed line spacing. Commands attention at the senior leadership level.",
    },

    # ---------------- Specialized Industry ----------------
    {
        "id": "federal_gov",
        "name": "Federal / Government Resume",
        "category": "Specialized",
        "best_for": ["Government", "Policy", "Analyst", "Federal Contractor"],
        "style": "structured",
        "ats_score": "High",
        "fonts": ["Times New Roman", "Georgia", "Arial"],
        "pages": "2-5",
        "notes": "USAJOBS-compliant: verbose bullet format, full dates (MM/YYYY), GS-level signals, supervisor contact, hours per week, salary history. More detail is better.",
    },
    {
        "id": "healthcare_clinical",
        "name": "Healthcare / Clinical Resume",
        "category": "Specialized",
        "best_for": ["Nurse", "Doctor", "PA", "Medical", "Clinical", "Allied Health"],
        "style": "minimal",
        "ats_score": "High",
        "fonts": ["Calibri", "Arial", "Open Sans"],
        "pages": "1-2",
        "notes": "License numbers, certifications (RN, ACLS, BLS), clinical rotations, specialties prominently up front. Clean and credential-forward.",
    },
    {
        "id": "educator_teacher",
        "name": "Educator / Teacher Resume",
        "category": "Specialized",
        "best_for": ["Teacher", "Professor", "Curriculum", "Instructional Designer", "Tutor"],
        "style": "classic",
        "ats_score": "High",
        "fonts": ["Georgia", "Open Sans", "Lato"],
        "pages": "1-2",
        "notes": "Certifications and licensure first, teaching philosophy, grade levels/subjects, student outcomes. State endorsements and continuing education included.",
    },
]


def templates_markdown() -> str:
    lines = ["## Template Library"]
    by_cat = {}
    for t in TEMPLATES:
        by_cat.setdefault(t["category"], []).append(t)
    for cat, items in by_cat.items():
        lines.append(f"\n### {cat}")
        for t in items:
            lines.append(
                f"- {t['name']} — {t['style']}, ATS {t['ats_score']}, "
                f"{t['pages']}, fonts: {', '.join(t['fonts'])}. {t['notes']}"
            )
    return "\n".join(lines)


def suggest_templates(role: str, experience_years: int, style_pref: str, ats_priority: str, limit: int = 5):
    """Return up to `limit` templates best matching the user profile, scored heuristically."""
    role_l = (role or "").lower()
    style_l = (style_pref or "").lower()
    ats_priority = (ats_priority or "high").lower()

    def score(t):
        s = 0
        if any(r.lower() in role_l for r in t["best_for"]):
            s += 5
        if t["style"] in style_l or style_l in t["style"]:
            s += 3
        if ats_priority == "high" and t["ats_score"] == "High":
            s += 3
        if ats_priority == "medium" and t["ats_score"] in ("High", "Medium"):
            s += 1
        if experience_years is not None:
            if experience_years < 3 and "Fresher" in t["name"]:
                s += 4
            if experience_years >= 10 and "Senior" in t["name"]:
                s += 3
            if experience_years >= 15 and "Executive" in t["category"]:
                s += 3
        return s

    scored = sorted(TEMPLATES, key=score, reverse=True)

    # When the caller wants a large set (gallery browse), return everything sorted by score.
    # The score>0 gate is only useful for small "suggested" lists where we want relevance.
    if limit >= len(TEMPLATES):
        return scored[:limit]

    top = [t for t in scored if score(t) > 0][:limit]
    if not top:
        top = scored[:limit]

    # Always include at least one pure-ATS high-score template
    if not any(t["ats_score"] == "High" for t in top):
        for t in TEMPLATES:
            if t["ats_score"] == "High":
                top.append(t)
                break
    return top[:limit]

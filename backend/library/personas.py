"""Recruiter personas — each evaluates a resume from a different lens."""

PERSONAS = {
    "google": {
        "name": "Google Recruiter",
        "lens": "Scale, measurable impact, XYZ bullets, technical depth, leadership signals.",
        "looks_for": [
            "Accomplished [X] as measured by [Y] by doing [Z] structure",
            "Concrete metrics on every bullet",
            "Scale language (millions of users, billions of requests)",
            "Cross-team leadership signals",
            "Strong CS fundamentals in skills",
        ],
        "red_flags": [
            "Vague bullets without metrics",
            "Buzzword soup without evidence",
            "No ownership language",
        ],
        "tone": "Direct, quantitative, technical.",
    },
    "amazon": {
        "name": "Amazon Bar Raiser",
        "lens": "Leadership Principles alignment. STAR structure. Bias for action, ownership, dive deep.",
        "looks_for": [
            "Bullets mapped to specific LPs (Customer Obsession, Ownership, Dive Deep)",
            "STAR format (Situation, Task, Action, Result)",
            "Clear customer or business impact",
            "Evidence of high standards and frugality",
        ],
        "red_flags": [
            "No customer-facing outcomes",
            "Passive voice",
            "Missing quantified results",
        ],
        "tone": "Ownership-first, customer-obsessed.",
    },
    "startup": {
        "name": "Early-Stage Startup Founder",
        "lens": "Scrappy builder energy. Shipping velocity. Breadth across stack. Ownership of end-to-end outcomes.",
        "looks_for": [
            "Shipped things fast, often alone or with tiny teams",
            "Breadth: full-stack, infra, product sense",
            "Evidence of going 0→1",
            "Comfort with ambiguity",
        ],
        "red_flags": [
            "Only big-company experience with narrow scope",
            "Process-heavy language without outcomes",
            "No side projects",
        ],
        "tone": "Builder, velocity, outcome-focused.",
    },
    "finance": {
        "name": "Goldman Sachs / IB Recruiter",
        "lens": "Formal, credentials, deal/transaction experience, modeling skills.",
        "looks_for": [
            "Top schools, GPA if strong",
            "Transaction size and scope",
            "Modeling and quantitative rigor",
            "Client impact in dollars",
            "Conservative formatting (Times New Roman / Garamond)",
        ],
        "red_flags": [
            "Unquantified impact",
            "Casual tone",
            "Creative/designy formatting",
        ],
        "tone": "Formal, polished, metric-heavy.",
    },
    "mckinsey": {
        "name": "McKinsey Partner",
        "lens": "Structured problem solving, client impact, leadership moments. MECE thinking visible.",
        "looks_for": [
            "Clear problem → approach → outcome narrative",
            "Scope of client impact ($M revenue, cost savings)",
            "Leadership and recruiting activities",
            "Analytical rigor",
        ],
        "red_flags": [
            "Unstructured bullets",
            "No evidence of impact beyond activity",
            "Missing leadership signals",
        ],
        "tone": "Structured, impact-led, executive.",
    },
    "faang_frontend": {
        "name": "Meta / Apple Design-Engineering Lead",
        "lens": "Craft. User-facing quality. Performance. A11y. Design sensibility.",
        "looks_for": [
            "Perf wins (LCP, CLS, bundle size)",
            "A11y and i18n work",
            "Design-system contributions",
            "Cross-functional with designers/PMs",
        ],
        "red_flags": [
            "Only feature counting",
            "No craft or quality signals",
        ],
        "tone": "Craft-forward, quality-obsessed.",
    },
    "data_ml": {
        "name": "ML / Data Hiring Manager",
        "lens": "Model performance, production impact, data rigor, experimentation discipline.",
        "looks_for": [
            "Model metrics (AUC, F1, lift, precision@k)",
            "Online impact (A/B test lifts, revenue, engagement)",
            "Data pipeline ownership",
            "Research → production path",
        ],
        "red_flags": [
            "Only tutorial-level projects",
            "No productionization evidence",
            "Missing statistical rigor",
        ],
        "tone": "Empirical, rigorous, outcome-led.",
    },
}


def persona_keys() -> list[str]:
    return list(PERSONAS.keys())


def get_persona(key: str) -> dict:
    return PERSONAS.get(key, PERSONAS["google"])

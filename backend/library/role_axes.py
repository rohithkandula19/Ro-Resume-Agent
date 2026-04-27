"""Role-fit radar axes per role family. 8 axes each, 0-10 scoring."""

ROLE_AXES = {
    "swe": [
        "Technical Depth", "System Design", "Code Quality", "Delivery / Shipping",
        "Impact & Metrics", "Collaboration", "Leadership / Mentorship", "Domain Expertise",
    ],
    "frontend": [
        "Component Craft", "Performance", "Accessibility", "Design Sensibility",
        "State Management", "Shipping Velocity", "Cross-functional", "Modern Tooling",
    ],
    "backend": [
        "System Design", "Scalability", "Reliability / SRE", "Data Modeling",
        "APIs & Contracts", "Performance", "Security", "Observability",
    ],
    "data_ml": [
        "Modeling", "Statistics & Rigor", "Feature Engineering", "Production ML",
        "Experimentation", "Data Pipelines", "Research Depth", "Business Impact",
    ],
    "pm": [
        "Product Sense", "Strategy", "Execution", "Data & Metrics",
        "User Research", "Stakeholder Mgmt", "Technical Depth", "Leadership",
    ],
    "design": [
        "Visual Craft", "Interaction Design", "User Research", "Systems Thinking",
        "Prototyping", "Collaboration", "Business Impact", "Tooling",
    ],
    "devops": [
        "Infra as Code", "CI/CD", "Containers & Orchestration", "Observability",
        "Incident Response", "Security", "Cloud Depth", "Automation",
    ],
    "sales": [
        "Quota Attainment", "Pipeline Generation", "Deal Size", "Industry Knowledge",
        "Negotiation", "Customer Relationships", "Discovery", "Forecasting",
    ],
    "marketing": [
        "Campaign Impact", "Analytics", "Brand & Messaging", "Growth Tactics",
        "Content", "Tooling", "Cross-functional", "Experimentation",
    ],
    "consulting": [
        "Structured Thinking", "Client Impact", "Analytical Rigor", "Communication",
        "Leadership", "Industry Knowledge", "Project Delivery", "Executive Presence",
    ],
}


def axes_for_role(role: str) -> list[str]:
    role_l = (role or "").lower()
    mapping = [
        (["frontend", "ui", "web"], "frontend"),
        (["backend", "api", "server"], "backend"),
        (["data", "ml", "machine learning", "ai", "research"], "data_ml"),
        (["product manager", "pm", "product"], "pm"),
        (["design", "ux", "ui designer"], "design"),
        (["devops", "sre", "platform", "infra"], "devops"),
        (["sales", "ae", "sdr", "bd"], "sales"),
        (["marketing", "growth", "brand"], "marketing"),
        (["consult", "strategy"], "consulting"),
        (["engineer", "developer", "software"], "swe"),
    ]
    for needles, key in mapping:
        if any(n in role_l for n in needles):
            return ROLE_AXES[key]
    return ROLE_AXES["swe"]

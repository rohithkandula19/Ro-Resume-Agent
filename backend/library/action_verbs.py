"""Categorized action verbs for strong resume bullets."""

ACTION_VERBS = {
    "leadership": [
        "Led", "Directed", "Headed", "Spearheaded", "Orchestrated", "Championed",
        "Mentored", "Coached", "Guided", "Oversaw", "Supervised", "Managed",
        "Mobilized", "Chaired", "Founded", "Pioneered", "Drove", "Steered",
    ],
    "build_create": [
        "Built", "Designed", "Architected", "Engineered", "Developed", "Created",
        "Constructed", "Formulated", "Established", "Implemented", "Launched",
        "Deployed", "Shipped", "Produced", "Prototyped", "Authored",
    ],
    "improve_optimize": [
        "Optimized", "Improved", "Enhanced", "Refined", "Streamlined",
        "Accelerated", "Upgraded", "Modernized", "Refactored", "Simplified",
        "Consolidated", "Standardized", "Boosted", "Scaled", "Strengthened",
    ],
    "analyze_research": [
        "Analyzed", "Evaluated", "Assessed", "Investigated", "Diagnosed",
        "Examined", "Identified", "Researched", "Measured", "Quantified",
        "Forecasted", "Modeled", "Benchmarked", "Audited", "Profiled",
    ],
    "deliver_impact": [
        "Delivered", "Drove", "Achieved", "Generated", "Produced", "Secured",
        "Closed", "Won", "Exceeded", "Surpassed", "Attained", "Yielded",
        "Executed", "Completed", "Finalized",
    ],
    "collaborate_influence": [
        "Partnered", "Collaborated", "Coordinated", "Facilitated", "Negotiated",
        "Influenced", "Advised", "Consulted", "Advocated", "Presented",
        "Communicated", "Briefed", "Aligned", "Unified",
    ],
    "save_reduce": [
        "Reduced", "Saved", "Cut", "Decreased", "Eliminated", "Minimized",
        "Lowered", "Trimmed", "Contained", "Mitigated", "Resolved",
    ],
    "grow_expand": [
        "Grew", "Expanded", "Scaled", "Multiplied", "Doubled", "Tripled",
        "Increased", "Accelerated", "Boosted", "Amplified", "Extended",
    ],
    "data_ml": [
        "Trained", "Fine-tuned", "Modeled", "Predicted", "Classified",
        "Clustered", "Deployed", "A/B tested", "Labeled", "Annotated",
        "Pipelined", "Featurized", "Evaluated",
    ],
    "product_ux": [
        "Launched", "Iterated", "Prototyped", "User-researched", "Validated",
        "Shipped", "Redesigned", "Positioned", "Roadmapped", "Prioritized",
    ],
}

WEAK_PHRASES = [
    "worked on", "involved in", "responsible for", "helped with",
    "assisted with", "participated in", "contributed to", "duties included",
    "tasked with", "in charge of", "hands-on experience with",
    "exposure to", "familiar with", "knowledge of",
]


def all_verbs() -> list[str]:
    out = []
    for v in ACTION_VERBS.values():
        out.extend(v)
    return sorted(set(out))


def verbs_for(category: str) -> list[str]:
    return ACTION_VERBS.get(category, [])


def markdown_catalog() -> str:
    lines = ["## Action Verb Library"]
    for cat, verbs in ACTION_VERBS.items():
        lines.append(f"\n**{cat.replace('_', ' ').title()}:** " + ", ".join(verbs))
    lines.append("\n\n**Avoid these weak phrases:** " + ", ".join(WEAK_PHRASES))
    return "\n".join(lines)

"""ATS X-Ray — map every bullet to matched JD keywords; highlight missing ones."""

import re
from collections import Counter


STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "for", "with",
    "at", "by", "from", "as", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "can", "could",
    "this", "that", "these", "those", "you", "your", "we", "our", "i", "my",
    "it", "its", "they", "their", "he", "she", "his", "her",
}

# Generic JD boilerplate — never useful as "skill gaps" for a resume.
JD_BOILERPLATE = {
    # pronouns/filler
    "you", "your", "we", "our", "us", "they", "them", "who", "what", "when",
    "where", "why", "how", "all", "any", "each", "every", "some", "other",
    "others", "such", "like", "also", "just", "well", "more", "most", "much",
    "many", "very", "only", "than", "then", "too", "both", "either", "neither",
    # JD section words
    "required", "qualifications", "preferred", "requirements", "responsibilities",
    "experience", "expertise", "knowledge", "background", "skill", "skills",
    "duties", "description", "position", "role", "roles", "job", "jobs", "posting",
    "opportunity", "opportunities", "candidate", "candidates", "applicant",
    "applicants", "application", "applications", "apply", "submit", "resume",
    "cover", "letter", "interview",
    # benefits / boilerplate
    "benefits", "salary", "compensation", "pay", "wage", "bonus", "equity",
    "stock", "401k", "pto", "vacation", "holiday", "insurance", "medical",
    "dental", "vision", "health", "wellness", "remote", "hybrid", "onsite",
    "relocation", "visa", "sponsorship", "deadline", "eeo", "equal", "opportunity",
    "employer", "diversity", "inclusion", "veteran", "disability", "gender",
    "race", "religion", "age", "national", "origin", "sexual", "orientation",
    "protected", "status",
    # generic verbs / soft framing
    "work", "working", "works", "worked", "join", "help", "helping", "build",
    "building", "create", "creating", "ensure", "ensuring", "provide", "providing",
    "use", "using", "used", "include", "includes", "including", "include", "etc",
    "across", "into", "onto", "upon", "within", "without", "through", "throughout",
    "per", "via", "over", "under", "out", "up", "down", "off", "again", "further",
    "here", "there",
    # scale words
    "years", "year", "months", "month", "days", "day", "hours", "hour",
    "minimum", "maximum", "minutes", "level", "levels", "teams", "team", "members",
    "member", "partners", "partner", "stakeholders", "stakeholder", "cross",
    "functional", "strong", "solid", "proven", "demonstrated", "excellent", "great",
    # meta words
    "role", "roles", "individual", "person", "people", "someone", "talented",
    "passionate", "driven", "motivated", "self", "independent", "collaborative",
}

# Tech-shape signals. CamelCase alone is NOT a signal (too many company names,
# e.g. UnitedHealth). Require ALL-CAPS acronym, digit mix, or punctuation.
_TECH_HINT = re.compile(
    r"(?:"
    r"\b[A-Z]{2,6}\b"                    # ALL CAPS acronyms (2-6): SQL, AWS, GCP, LLM, RAG
    r"|[a-zA-Z]+\+\+|\b[A-Za-z]#\b"      # C++, C#
    r"|[a-z]+\.(?:js|ts|py|io|ai|net)"   # react.js, node.js, .net
    r"|\b\d+[a-z]+\b|\b[a-z]+\d+\b"      # k8s, ec2, s3, m1
    r"|[a-z]+/[a-z]+"                    # ci/cd, tcp/ip
    r")",
)

_TECH_KEYWORDS_ALLOW = {
    # explicit allow-list of common lowercase skills that the regex misses
    "python", "java", "javascript", "typescript", "golang", "rust", "kotlin",
    "swift", "ruby", "scala", "perl", "bash", "shell",
    "react", "angular", "vue", "svelte", "node", "nodejs", "django", "flask",
    "fastapi", "spring", "express", "rails", "laravel", "nextjs", "nuxt",
    "postgres", "postgresql", "mysql", "mongodb", "redis", "cassandra",
    "elasticsearch", "dynamodb", "snowflake", "bigquery", "redshift",
    "docker", "kubernetes", "terraform", "ansible", "jenkins", "circleci",
    "github", "gitlab", "bitbucket", "jira", "confluence",
    "tensorflow", "pytorch", "keras", "sklearn", "xgboost", "lightgbm",
    "transformers", "langchain", "llamaindex", "huggingface",
    "llm", "llms", "rag", "mlops", "llmops", "nlp", "cv", "ml", "ai",
    "gpt", "bert", "gemini", "claude", "openai", "anthropic",
    "embeddings", "embedding", "vector", "retrieval", "ranking",
    "fine-tuning", "finetuning", "prompt", "prompts", "agent", "agents",
    "inference", "training", "deployment", "pipeline", "pipelines",
    "kubernetes", "serverless", "microservices", "rest", "graphql", "grpc",
    "kafka", "spark", "hadoop", "airflow", "dagster", "dbt",
    "aws", "gcp", "azure", "databricks", "snowflake",
    "ci/cd", "cicd", "observability", "monitoring", "logging", "tracing",
    "drift", "guardrails", "evaluation", "counterfactuals", "simulation",
    "supervised", "unsupervised", "reinforcement", "forecasting", "classification",
    "regression", "clustering", "recommendation", "recommendations",
    "fairness", "bias", "privacy", "gdpr", "ccpa", "hipaa", "pii", "phi",
    "statistics", "statistical", "bayesian",
    "feature", "features", "registry", "registries", "reproducibility",
    "retrieval-augmented",
}


def _tokens(text: str) -> list[str]:
    if not text:
        return []
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9+.\-/#]*", text.lower())
    return [t for t in tokens if t not in STOPWORDS and len(t) > 1]


def _bigrams(tokens: list[str]) -> list[str]:
    return [f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens) - 1)]


def _looks_like_skill(term: str, raw_text: str = "") -> bool:
    """Keep only tokens that look like tech / tools / methodology — drop English filler."""
    t = term.strip().lower()
    if len(t) < 2:
        return False
    if t in JD_BOILERPLATE:
        return False
    # Any sub-token in the boilerplate list disqualifies a bigram
    parts = t.split()
    if any(p in JD_BOILERPLATE for p in parts):
        return False
    # Explicit allow-list wins (common lowercase tech terms)
    if t in _TECH_KEYWORDS_ALLOW:
        return True
    if any(p in _TECH_KEYWORDS_ALLOW for p in parts):
        return True
    # CamelCase / ALL CAPS / digit-letter mixes / .js-style names show up as tech in the raw text
    if _TECH_HINT.search(raw_text):
        # Check the ORIGINAL-case occurrence of this term in raw text
        # If the term appears in a tech-hint pattern, keep it
        try:
            pat = re.compile(r"\b" + re.escape(term) + r"\b", re.IGNORECASE)
            for m in pat.finditer(raw_text):
                span = raw_text[max(0, m.start()-2):min(len(raw_text), m.end()+2)]
                if _TECH_HINT.search(span) or _TECH_HINT.fullmatch(m.group(0)):
                    return True
        except re.error:
            pass
    # Multi-word phrases with an allowed term inside (e.g. "model registries", "prompt engineering")
    if len(parts) == 2 and (parts[0] in _TECH_KEYWORDS_ALLOW or parts[1] in _TECH_KEYWORDS_ALLOW):
        return True
    return False


def extract_jd_keywords(jd_text: str, top_k: int = 30) -> list[str]:
    toks = _tokens(jd_text)
    counts = Counter(toks) + Counter(_bigrams(toks))
    out: list[str] = []
    seen: set[str] = set()
    for term, _ in counts.most_common():
        if len(term) < 2 or term in seen:
            continue
        if not _looks_like_skill(term, jd_text):
            continue
        out.append(term)
        seen.add(term)
        if len(out) >= top_k:
            break
    return out


def _as_text(v) -> str:
    """Coerce LLM-returned values (which may be str, list, dict, or None) into searchable text."""
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    if isinstance(v, list):
        return " ".join(_as_text(x) for x in v)
    if isinstance(v, dict):
        return " ".join(_as_text(x) for x in v.values())
    return str(v)


def xray_bullet(bullet, jd_keywords: list[str]) -> dict:
    """For one bullet, list which JD keywords it matches."""
    text = _as_text(bullet)
    text_l = text.lower()
    hits = [kw for kw in jd_keywords if kw in text_l]
    return {"bullet": text, "hits": hits, "match_count": len(hits)}


def xray_resume(resume: dict, jd_text: str) -> dict:
    """Return per-bullet hits + overall missing keywords + coverage %."""
    jd_keywords = extract_jd_keywords(jd_text)
    bullets_report: list[dict] = []

    def scan(section_name: str, items: list):
        for item in items or []:
            if not isinstance(item, dict):
                continue
            for b in item.get("bullets", []) or []:
                r = xray_bullet(b, jd_keywords)
                r["section"] = section_name
                r["item"] = _as_text(item.get("title", ""))
                bullets_report.append(r)

    scan("experience", resume.get("experience"))
    scan("projects", resume.get("projects"))

    summary_l = _as_text(resume.get("summary")).lower()
    summary_hits = [kw for kw in jd_keywords if kw in summary_l]
    skills_blob = _as_text(resume.get("skills")).lower()
    skill_hits = [kw for kw in jd_keywords if kw in skills_blob]

    matched = set(summary_hits + skill_hits)
    for r in bullets_report:
        matched.update(r["hits"])

    missing = [kw for kw in jd_keywords if kw not in matched]
    coverage = round(100 * len(matched) / max(1, len(jd_keywords)))

    return {
        "jd_keywords": jd_keywords,
        "matched_keywords": sorted(matched),
        "missing_keywords": missing,
        "coverage_percent": coverage,
        "bullets_report": bullets_report,
        "summary_hits": summary_hits,
        "skills_hits": skill_hits,
    }

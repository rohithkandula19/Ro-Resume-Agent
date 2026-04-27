"""Skills taxonomy — auto-categorize skills into buckets."""

TAXONOMY = {
    "Languages": [
        "python", "java", "javascript", "typescript", "go", "golang", "rust",
        "c++", "c#", "ruby", "php", "scala", "kotlin", "swift", "r", "matlab",
        "sql", "bash", "shell", "perl", "objective-c", "dart", "elixir", "haskell",
    ],
    "Frontend": [
        "react", "next.js", "nextjs", "vue", "angular", "svelte", "html", "css",
        "tailwind", "sass", "redux", "zustand", "remix", "solid", "htmx",
    ],
    "Backend": [
        "node", "node.js", "express", "fastapi", "flask", "django", "spring",
        "spring boot", "rails", "laravel", ".net", "dotnet", "graphql",
        "rest", "grpc", "nestjs",
    ],
    "Data/ML": [
        "pandas", "numpy", "scikit-learn", "sklearn", "pytorch", "tensorflow",
        "keras", "xgboost", "lightgbm", "spark", "hadoop", "airflow", "dbt",
        "mlflow", "huggingface", "transformers", "langchain", "llamaindex",
        "rag", "vector db", "embeddings",
    ],
    "Cloud": [
        "aws", "gcp", "azure", "s3", "ec2", "lambda", "ecs", "eks", "rds",
        "dynamodb", "cloudfront", "cloud run", "bigquery", "dataflow",
        "azure functions", "cosmosdb",
    ],
    "Databases": [
        "postgres", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
        "snowflake", "bigquery", "clickhouse", "cassandra", "oracle", "sqlite",
        "dynamodb", "cockroachdb", "sqlserver",
    ],
    "DevOps/Infra": [
        "docker", "kubernetes", "k8s", "terraform", "ansible", "helm", "jenkins",
        "github actions", "gitlab ci", "circleci", "argo", "prometheus",
        "grafana", "datadog", "new relic", "sentry", "opentelemetry", "linux",
    ],
    "Mobile": [
        "ios", "android", "react native", "flutter", "swift", "kotlin",
        "xamarin", "expo",
    ],
    "Tools": [
        "git", "github", "gitlab", "jira", "confluence", "figma", "notion",
        "slack", "linear", "postman", "swagger", "openapi",
    ],
    "Testing": [
        "jest", "pytest", "mocha", "cypress", "selenium", "playwright",
        "junit", "rspec", "vitest", "testing-library",
    ],
    "Soft Skills": [
        "leadership", "mentoring", "cross-functional", "stakeholder management",
        "communication", "public speaking", "negotiation", "problem solving",
        "strategic thinking", "project management", "roadmapping",
    ],
    "Methodologies": [
        "agile", "scrum", "kanban", "tdd", "bdd", "ddd", "microservices",
        "event-driven", "serverless", "ci/cd", "devsecops", "sre",
    ],
}


def categorize(skills: list[str]) -> dict[str, list[str]]:
    """Match skills to categories. Requires exact match OR the skill's full
    token list (e.g. 'react native') == a taxonomy term. No substring matching —
    otherwise 'r' inside 'react' mis-categorizes as Languages."""
    out: dict[str, list[str]] = {k: [] for k in TAXONOMY}
    out["Other"] = []
    for s in skills:
        s_clean = s.strip()
        s_low = s_clean.lower()
        placed = False
        for cat, terms in TAXONOMY.items():
            for t in terms:
                if t == s_low:
                    out[cat].append(s_clean); placed = True; break
                # Multi-word taxonomy term fully contained in skill (e.g. 'github actions' inside 'GitHub Actions CI')
                if " " in t and t in s_low:
                    out[cat].append(s_clean); placed = True; break
                # Multi-word skill fully contained in taxonomy list (e.g. 'node' for skill 'node.js' is handled by exact match above; this covers composite skills)
                if " " in s_low and s_low in t:
                    out[cat].append(s_clean); placed = True; break
            if placed:
                break
        if not placed:
            out["Other"].append(s_clean)
    return {k: v for k, v in out.items() if v}


def format_markdown(categorized: dict[str, list[str]]) -> str:
    lines = []
    for cat, items in categorized.items():
        lines.append(f"**{cat}:** {', '.join(items)}")
    return "\n\n".join(lines)

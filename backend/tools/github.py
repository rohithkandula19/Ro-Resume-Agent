"""GitHub profile importer — pull public repos + extract project summaries."""

import os
import re

import requests


GITHUB_API = "https://api.github.com"


def _headers():
    h = {"Accept": "application/vnd.github+json", "User-Agent": "ro-resume-agent"}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _parse_handle(url_or_handle: str) -> str:
    s = (url_or_handle or "").strip()
    m = re.search(r"github\.com/([^/?#]+)", s)
    if m:
        return m.group(1)
    return s.lstrip("@")


def fetch_profile(handle_or_url: str) -> dict:
    handle = _parse_handle(handle_or_url)
    r = requests.get(f"{GITHUB_API}/users/{handle}", headers=_headers(), timeout=15)
    r.raise_for_status()
    return r.json()


def fetch_top_repos(handle_or_url: str, limit: int = 8) -> list[dict]:
    handle = _parse_handle(handle_or_url)
    r = requests.get(
        f"{GITHUB_API}/users/{handle}/repos",
        headers=_headers(),
        params={"sort": "updated", "per_page": 50},
        timeout=15,
    )
    r.raise_for_status()
    repos = r.json()
    repos = [x for x in repos if not x.get("fork")]
    repos.sort(key=lambda x: x.get("stargazers_count", 0), reverse=True)
    repos = repos[:limit]
    out = []
    for repo in repos:
        out.append({
            "name": repo["name"],
            "url": repo["html_url"],
            "description": repo.get("description") or "",
            "language": repo.get("language") or "",
            "stars": repo.get("stargazers_count", 0),
            "forks": repo.get("forks_count", 0),
            "topics": repo.get("topics") or [],
            "updated_at": repo.get("updated_at", ""),
        })
    return out


def summarize_for_resume(client, repos: list[dict], role: str) -> dict:
    """Ask the model to pick the 3-5 most relevant repos and write resume-ready bullets."""
    import json
    from agent import chat, model_primary

    system = (
        "Given a set of GitHub repos and a target role, select 3-5 repos most relevant "
        "to the role and write 2-3 resume bullets each. Return VALID JSON only: "
        "{selected:[{name:string, url:string, bullets:[string], tech_stack:[string]}]}. "
        "Bullets follow strong-verb + tech + impact rules. Use [X] for unknown metrics. "
        "No fabricated stars/users. No prose."
    )
    user = f"ROLE: {role}\nREPOS:\n{json.dumps(repos)}"
    raw = chat(
        client,
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        model=model_primary(), temperature=0.3, max_tokens=1800,
    )
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE)
    try:
        return json.loads(raw)
    except Exception:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        return json.loads(m.group(0)) if m else {}

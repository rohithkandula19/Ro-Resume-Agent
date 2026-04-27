"""Before/After bullet diff with impact delta."""

import difflib


def bullet_diff(original: str, rewritten: str) -> dict:
    matcher = difflib.SequenceMatcher(a=original or "", b=rewritten or "")
    ratio = round(matcher.ratio() * 100)
    orig_words = (original or "").split()
    new_words = (rewritten or "").split()
    delta_words = len(new_words) - len(orig_words)
    has_metric = any(ch.isdigit() for ch in (rewritten or ""))
    orig_has_metric = any(ch.isdigit() for ch in (original or ""))
    return {
        "original": original,
        "rewritten": rewritten,
        "similarity_percent": ratio,
        "word_delta": delta_words,
        "added_metrics": has_metric and not orig_has_metric,
    }


def resume_diff(old_resume: dict, new_resume: dict) -> list[dict]:
    """Pair bullets by index across experience + projects sections."""
    diffs = []
    for section in ("experience", "projects"):
        olds = old_resume.get(section) or []
        news = new_resume.get(section) or []
        for o_item, n_item in zip(olds, news):
            o_bullets = o_item.get("bullets", []) or []
            n_bullets = n_item.get("bullets", []) or []
            for o, n in zip(o_bullets, n_bullets):
                d = bullet_diff(o, n)
                d["section"] = section
                d["item"] = n_item.get("title", "")
                diffs.append(d)
    return diffs

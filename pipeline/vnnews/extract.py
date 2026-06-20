"""Main-text extraction + excerpt building.

Replaces the brittle regex cleaning in src/utils/newsFeed.ts. We keep only a
capped excerpt for storage; full text stays in memory for this run (hashing,
and Phase 1 LLM enrichment).
"""

from __future__ import annotations

import re

import trafilatura

EXCERPT_MAX_CHARS = 500
_WS = re.compile(r"\s+")
_TAGS = re.compile(r"<[^>]+>")


def clean_text(value: str) -> str:
    """Strip HTML and collapse whitespace from an RSS summary."""
    no_tags = _TAGS.sub(" ", value or "")
    return _WS.sub(" ", no_tags).strip()


def extract_main_text(html: str) -> str:
    """Best-effort article body extraction. Empty string on failure."""
    if not html:
        return ""
    try:
        extracted = trafilatura.extract(
            html,
            include_comments=False,
            include_tables=False,
            favor_precision=True,
        )
    except Exception:
        return ""
    return (extracted or "").strip()


def build_excerpt(*candidates: str) -> str:
    """First non-empty candidate, cleaned and capped (never the full body)."""
    for candidate in candidates:
        text = clean_text(candidate)
        if text:
            if len(text) > EXCERPT_MAX_CHARS:
                return text[: EXCERPT_MAX_CHARS - 1].rstrip() + "…"
            return text
    return ""

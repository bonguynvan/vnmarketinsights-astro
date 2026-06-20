"""Domain types shared across the pipeline."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timezone


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def article_id_for(url: str) -> str:
    """Stable primary key derived from the canonical URL."""
    return hashlib.sha256(url.strip().encode("utf-8")).hexdigest()


def content_hash_for(text: str) -> str:
    """Hash of normalized text for exact-duplicate detection."""
    normalized = " ".join(text.split()).lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


@dataclass
class Article:
    """A single crawled item, pre-enrichment.

    `full_text` is held in memory only for extraction/hashing during a run.
    We persist `raw_excerpt` (capped, attribution-friendly), never the full body.
    """

    url: str
    source: str
    title: str
    raw_excerpt: str
    pub_date: str
    lang: str = "vi"
    full_text: str = ""
    fetched_at: str = field(default_factory=_now_iso)

    @property
    def id(self) -> str:
        return article_id_for(self.url)

    @property
    def content_hash(self) -> str:
        basis = self.full_text or self.raw_excerpt or self.title
        return content_hash_for(basis)

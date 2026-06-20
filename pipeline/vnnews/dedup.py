"""Deduplication.

Phase 0: exact dedup by article id (URL) and by content hash (same text under
different URLs). Semantic dedup (embedding cosine clustering) is Phase 1, once
embeddings exist on the articles table.
"""

from __future__ import annotations

from dataclasses import dataclass

from .models import Article


@dataclass
class DedupResult:
    fresh: list[Article]
    dropped_by_id: int
    dropped_by_hash: int


def dedup(
    articles: list[Article],
    seen_ids: set[str],
    seen_hashes: set[str],
) -> DedupResult:
    fresh: list[Article] = []
    dropped_by_id = 0
    dropped_by_hash = 0

    batch_ids: set[str] = set()
    batch_hashes: set[str] = set()

    for article in articles:
        aid = article.id
        if aid in seen_ids or aid in batch_ids:
            dropped_by_id += 1
            continue

        chash = article.content_hash
        if chash in seen_hashes or chash in batch_hashes:
            dropped_by_hash += 1
            continue

        batch_ids.add(aid)
        batch_hashes.add(chash)
        fresh.append(article)

    return DedupResult(fresh=fresh, dropped_by_id=dropped_by_id, dropped_by_hash=dropped_by_hash)

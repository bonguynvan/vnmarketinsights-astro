"""Orchestrator + CLI.

Commands:
  crawl      crawl -> extract -> dedup -> store               (Phase 0, no key)
  enrich     Claude Haiku enrichment of un-enriched articles  (Phase 1, needs key)
  embed      Gemini embeddings for enriched articles          (Phase 3, needs key)
  brief      generate weekly Markdown brief into Astro content (Phase 1)
  aggregate  rebuild daily trend_snapshots from enrichment     (Phase 2)
  publish    recent-by-topic.json, trends.json, entities, index(Phase 2/3)
  notify     POST latest brief to LEAD_WEBHOOK_URL             (Phase 2)
  telegram   post daily English headlines to a public channel (Phase 2)
  all        crawl -> enrich -> embed -> aggregate -> brief -> publish -> notify -> telegram
"""

from __future__ import annotations

import asyncio

from . import db
from .aggregate import run_aggregate
from .brief import run_brief
from .config import Settings, load_settings
from .crawl import crawl_all
from .dedup import dedup
from .embed import run_embed
from .enrich import run_enrich
from .notify import run_notify
from .publish import run_publish
from .telegram import run_telegram


def run_crawl(settings: Settings) -> int:
    print(f"Sources: {', '.join(s.name for s in settings.sources)}")
    print("\n[1/4] Crawling…")
    articles = asyncio.run(crawl_all(settings.sources, settings.user_agent))
    print(f"  crawled {len(articles)} items (pre-dedup)")

    with db.connect(settings.db_path) as conn:
        db.init_db(conn)
        before = db.count_articles(conn)
        print("\n[2/4] Deduplicating…")
        result = dedup(articles, db.known_ids(conn), db.known_content_hashes(conn))
        print(
            f"  fresh={len(result.fresh)} "
            f"dropped_by_url={result.dropped_by_id} "
            f"dropped_by_content={result.dropped_by_hash}"
        )
        print("\n[3/4] Storing…")
        inserted = sum(1 for a in result.fresh if db.insert_article(conn, a))
        after = db.count_articles(conn)
        print(f"\n[4/4] Done. inserted={inserted} total_in_db={after} (was {before})")
    return inserted


def run(command: str = "crawl") -> None:
    settings = load_settings()
    print(f"DB: {settings.db_path}")

    commands = ("crawl", "enrich", "embed", "brief", "aggregate", "publish", "notify", "all")
    if command not in commands:
        print(f"Unknown command: {command}. Use: {' | '.join(commands)}")
        return

    if command in ("crawl", "all"):
        run_crawl(settings)
    if command in ("enrich", "all"):
        print("\n== Enrich ==")
        run_enrich(settings)
    if command in ("embed", "all"):
        print("\n== Embed ==")
        run_embed(settings)
    if command in ("aggregate", "all"):
        print("\n== Aggregate ==")
        run_aggregate(settings)
    if command in ("brief", "all"):
        print("\n== Brief ==")
        run_brief(settings)
    if command in ("publish", "all"):
        print("\n== Publish ==")
        run_publish(settings)
    if command in ("notify", "all"):
        print("\n== Notify ==")
        run_notify(settings)
    if command in ("telegram", "all"):
        print("\n== Telegram ==")
        run_telegram(settings)


if __name__ == "__main__":
    import sys

    run(sys.argv[1] if len(sys.argv) > 1 else "crawl")

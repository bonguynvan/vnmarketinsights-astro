"""Publish enriched data into the Astro site.

Writes:
  - src/data/recent-by-topic.json  -> topic-page "Recent developments" blocks
  - src/data/trends.json           -> real topic momentum (replaces simulated)
  - src/content/articles/company-<slug>.md -> per-company entity pages

All outputs are derived data + source links (never full article bodies).
"""

from __future__ import annotations

import array
import json
import re
from collections import defaultdict
from datetime import datetime, timezone

from . import db
from .config import Settings

# enrichment topic -> existing site page slug (see src/data/topic-graph.ts)
SITE_TOPIC = {
    "payments": "payments", "ecommerce": "ecommerce", "logistics": "logistics",
    "consumers": "consumers", "regulation": "regulations",
    "stocks": "financial-markets", "macro": "financial-markets",
    "platforms": "platforms",
}
RECENT_PER_TOPIC = 6
RECENT_WINDOW = 60          # most recent N enriched articles to consider
MIN_COMPANY_MENTIONS = 3    # build an entity page only past this threshold
COMPANY_PAGE_ITEMS = 12
SEARCH_INDEX_SIZE = 400     # most recent N embedded articles in the search index


def _slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "company"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _recent_rows(conn) -> list:
    return conn.execute(
        """
        SELECT a.title, a.url, a.source, a.pub_date,
               e.summary_vn, e.summary_en, e.topic, e.sentiment,
               e.entities, e.importance
        FROM enrichment e JOIN articles a ON a.id = e.article_id
        ORDER BY a.fetched_at DESC
        LIMIT ?
        """,
        (RECENT_WINDOW,),
    ).fetchall()


def _write_recent_by_topic(rows: list, settings: Settings) -> int:
    grouped: dict[str, list] = defaultdict(list)
    for r in rows:
        slug = SITE_TOPIC.get(r["topic"] or "other")
        if not slug or len(grouped[slug]) >= RECENT_PER_TOPIC:
            continue
        grouped[slug].append({
            "title": r["title"],
            "url": r["url"],
            "source": r["source"],
            "summary_en": r["summary_en"],
            "summary_vn": r["summary_vn"],
            "pubDate": r["pub_date"],
            "sentiment": r["sentiment"],
            "importance": r["importance"],
        })
    payload = {"generatedAt": _now(), "topics": grouped}
    settings_data_dir = settings.articles_dir.parent.parent / "data"
    settings_data_dir.mkdir(parents=True, exist_ok=True)
    out = settings_data_dir / "recent-by-topic.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  wrote {out} ({sum(len(v) for v in grouped.values())} items)")
    return len(grouped)


def _trend_tag(growth: float, total: int) -> str:
    if total >= 8 and growth > 0.2:
        return "Rising Star"
    if growth > 0.5:
        return "Flash Trend"
    if total >= 8:
        return "Stable"
    if growth < -0.2:
        return "Saturated"
    return "Emerging"


def _write_trends(conn, settings: Settings) -> int:
    rows = conn.execute(
        """
        SELECT topic, date, mention_count, avg_sentiment
        FROM trend_snapshots WHERE term = '__topic__'
        ORDER BY topic, date
        """
    ).fetchall()
    series: dict[str, list] = defaultdict(list)
    for r in rows:
        series[r["topic"]].append({
            "date": r["date"],
            "count": r["mention_count"],
            "sentiment": r["avg_sentiment"],
        })

    trends = []
    for topic, pts in series.items():
        total = sum(p["count"] for p in pts)
        first, last = pts[0]["count"], pts[-1]["count"]
        growth = (last - first) / first if first else 0.0
        trends.append({
            "topic": topic,
            "siteSlug": SITE_TOPIC.get(topic, ""),
            "total": total,
            "growthRate": round(growth, 3),
            "avgSentiment": round(sum(p["sentiment"] for p in pts) / len(pts), 3),
            "tag": _trend_tag(growth, total),
            "series": pts,
        })
    trends.sort(key=lambda t: t["total"], reverse=True)

    payload = {"generatedAt": _now(), "trends": trends}
    data_dir = settings.articles_dir.parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    out = data_dir / "trends.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  wrote {out} ({len(trends)} topics)")
    return len(trends)


RELATED_PER_ENTITY = 4


def _load_embedded(conn) -> list[dict]:
    """All embedded articles with decoded vectors (normalized, so dot == cosine)."""
    rows = conn.execute(
        """
        SELECT a.url, a.title, a.source, a.embedding, e.summary_en
        FROM articles a JOIN enrichment e ON e.article_id = a.id
        WHERE a.embedding IS NOT NULL
        """
    ).fetchall()
    out = []
    for r in rows:
        vec = array.array("f")
        vec.frombytes(r["embedding"])
        out.append({
            "url": r["url"], "title": r["title"], "source": r["source"],
            "summary_en": r["summary_en"], "vec": list(vec),
        })
    return out


def _dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def _related_for(centroid: list[float], embedded: list[dict], exclude: set[str]) -> list[dict]:
    scored = [
        (e, _dot(centroid, e["vec"]))
        for e in embedded
        if e["url"] not in exclude
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [e for e, _ in scored[:RELATED_PER_ENTITY]]


def _write_entity_pages(conn, settings: Settings) -> int:
    counts = conn.execute(
        """
        SELECT term, SUM(mention_count) c
        FROM trend_snapshots WHERE term != '__topic__'
        GROUP BY term HAVING c >= ? ORDER BY c DESC
        """,
        (MIN_COMPANY_MENTIONS,),
    ).fetchall()

    embedded = _load_embedded(conn)
    embedded_by_url = {e["url"]: e for e in embedded}

    written = 0
    for row in counts:
        company = row["term"]
        mentions = conn.execute(
            """
            SELECT a.title, a.url, a.source, a.pub_date, e.summary_en, e.topic
            FROM enrichment e JOIN articles a ON a.id = e.article_id
            WHERE e.entities LIKE ?
            ORDER BY a.fetched_at DESC LIMIT ?
            """,
            (f'%"{company}"%', COMPANY_PAGE_ITEMS),
        ).fetchall()
        if not mentions:
            continue

        slug = f"company-{_slugify(company)}"
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        lines = [
            "---",
            f'title: "{company} — Vietnam Market Coverage"',
            f'description: "Recent Vietnam market and business news mentioning {company}, '
            'with neutral summaries and source links."',
            f'publishedDate: "{date_str}"',
            f'lastUpdated: "{date_str}"',
            'category: "Company"',
            "readingTime: 3",
            "---",
            "",
            f"# {company}",
            "",
            f"Recent Vietnam market news mentioning **{company}** "
            f"({int(row['c'])} mentions tracked). Summaries are AI-generated from "
            "public sources and link to the originals.",
            "",
            "## Recent mentions",
            "",
        ]
        mention_urls = {m["url"] for m in mentions}
        for m in mentions:
            lines.append(f"**{m['title']}**  ")
            lines.append(f"\n{m['summary_en']}\n")
            lines.append(f"- Source: [{m['source']}]({m['url']})\n")

        # Related coverage via embedding similarity (centroid of this entity's
        # mentions vs the rest of the corpus). Only when embeddings exist.
        mention_vecs = [embedded_by_url[u]["vec"] for u in mention_urls if u in embedded_by_url]
        if mention_vecs:
            dims = len(mention_vecs[0])
            centroid = [sum(v[i] for v in mention_vecs) / len(mention_vecs) for i in range(dims)]
            related = _related_for(centroid, embedded, exclude=mention_urls)
            if related:
                lines.append("## Related coverage\n")
                for rel in related:
                    lines.append(f"- [{rel['title']}]({rel['url']}) — {rel['source']}")
                lines.append("")

        lines.append("---\n")
        lines.append("*Aggregated from public news sources. Neutral, not investment advice.*\n")

        out = settings.articles_dir / f"{slug}.md"
        out.write_text("\n".join(lines), encoding="utf-8")
        written += 1

    print(f"  wrote {written} entity pages")
    return written


def _write_search_index(conn, settings: Settings) -> int:
    """Export embedded articles for semantic search (server-side cosine).

    Vectors are normalized at embed time, so cosine == dot product. Stored
    rounded to 5 decimals to keep the index compact.
    """
    rows = conn.execute(
        """
        SELECT a.id, a.title, a.url, a.source, a.pub_date, a.embedding,
               e.summary_en, e.summary_vn, e.topic, e.sentiment
        FROM articles a JOIN enrichment e ON e.article_id = a.id
        WHERE a.embedding IS NOT NULL
        ORDER BY a.fetched_at DESC
        LIMIT ?
        """,
        (SEARCH_INDEX_SIZE,),
    ).fetchall()

    items = []
    for r in rows:
        vec = array.array("f")
        vec.frombytes(r["embedding"])
        items.append({
            "title": r["title"],
            "url": r["url"],
            "source": r["source"],
            "pubDate": r["pub_date"],
            "summary_en": r["summary_en"],
            "summary_vn": r["summary_vn"],
            "topic": r["topic"],
            "siteSlug": SITE_TOPIC.get(r["topic"] or "other", ""),
            "sentiment": r["sentiment"],
            "vec": [round(x, 5) for x in vec],
        })

    payload = {
        "generatedAt": _now(),
        "model": settings.embed_model,
        "dims": settings.embed_dims,
        "items": items,
    }
    data_dir = settings.articles_dir.parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    out = data_dir / "news-index.json"
    out.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(f"  wrote {out} ({len(items)} embedded items)")
    return len(items)


def run_publish(settings: Settings) -> None:
    with db.connect(settings.db_path) as conn:
        db.init_db(conn)
        rows = _recent_rows(conn)
        if not rows:
            print("  [info] nothing enriched yet — run `enrich` first.")
            return
        _write_recent_by_topic(rows, settings)
        _write_trends(conn, settings)
        _write_entity_pages(conn, settings)
        _write_search_index(conn, settings)

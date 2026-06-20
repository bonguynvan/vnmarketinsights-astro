"""Weekly brief generator.

Selects the most important enriched articles from the last 7 days, groups them
by topic, and writes a Markdown file into the Astro content collection. The
frontmatter matches src/content/config.ts exactly, so /insights/<slug> renders
it with zero Astro changes.

Body is built deterministically from stored enrichment (summaries + source
links — attribution preserved, no full bodies). One short LLM call writes a
neutral executive overview; falls back to a template if no API key.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import anthropic

from . import db
from .config import Settings

TOPIC_LABELS = {
    "payments": "Payments", "ecommerce": "E-commerce", "logistics": "Logistics",
    "consumers": "Consumers", "regulation": "Regulation", "stocks": "Stock Market",
    "macro": "Macroeconomy", "platforms": "Platforms", "other": "Other",
}
WINDOW_DAYS = 7
MAX_ITEMS = 25
INTRO_INPUT_ITEMS = 12


def _overview(settings: Settings, rows: list) -> str:
    headlines = [f"- ({TOPIC_LABELS.get(r['topic'], r['topic'])}) {r['summary_en']}"
                 for r in rows[:INTRO_INPUT_ITEMS]]
    fallback = (
        "This brief summarizes the most notable developments in Vietnam's market "
        "and business news over the past week, grouped by topic. Each item links "
        "to its original source."
    )
    if not settings.anthropic_api_key:
        return fallback
    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        resp = client.messages.create(
            model=settings.model,
            max_tokens=400,
            system=(
                "You write neutral, factual market-news overviews. No hype, no "
                "predictions, no investment advice. 2-3 sentences only."
            ),
            messages=[{
                "role": "user",
                "content": "Write a 2-3 sentence neutral overview of this week's "
                           "Vietnam market news based ONLY on these summaries:\n\n"
                           + "\n".join(headlines),
            }],
        )
        text = "".join(b.text for b in resp.content if b.type == "text").strip()
        return text or fallback
    except Exception as exc:
        print(f"  [warn] overview generation failed -> {exc}")
        return fallback


def _group_by_topic(rows: list) -> dict[str, list]:
    grouped: dict[str, list] = {}
    for row in rows:
        grouped.setdefault(row["topic"] or "other", []).append(row)
    # stable, label-ordered
    return {k: grouped[k] for k in TOPIC_LABELS if k in grouped}


def _render(date: datetime, overview: str, grouped: dict[str, list]) -> tuple[str, str]:
    date_str = date.strftime("%Y-%m-%d")
    iso_week = date.isocalendar()
    title = f"Vietnam Market Brief — {date.strftime('%B %d, %Y')}"
    description = (
        f"Weekly digest of Vietnam market and business news, "
        f"week {iso_week.week} {iso_week.year}, grouped by topic with sources."
    )

    lines: list[str] = []
    lines.append("---")
    lines.append(f'title: "{title}"')
    lines.append(f'description: "{description}"')
    lines.append(f'publishedDate: "{date_str}"')
    lines.append(f'lastUpdated: "{date_str}"')
    lines.append('category: "Market Brief"')

    body: list[str] = []
    body.append(f"# {title}\n")
    body.append("## Overview\n")
    body.append(overview + "\n")

    for topic, items in grouped.items():
        body.append(f"## {TOPIC_LABELS[topic]}\n")
        for r in items:
            body.append(f"**{r['title']}**  ")
            body.append(f"\n{r['summary_en']}\n")
            stats = json.loads(r["key_stats"] or "[]")
            if stats:
                facts = "; ".join(
                    f"{s.get('label')}: {s.get('value')}{(' ' + s['unit']) if s.get('unit') else ''}"
                    for s in stats[:4]
                )
                body.append(f"- Key figures: {facts}")
            body.append(f"- Source: [{r['source']}]({r['url']})\n")

    body.append("---\n")
    body.append(
        "*Summaries are AI-generated from public news sources and link to the "
        "originals. Neutral, factual, not investment advice.*\n"
    )

    body_text = "\n".join(body)
    words = len(body_text.split())
    lines.append(f"readingTime: {max(1, round(words / 200))}")
    lines.append("---\n")
    return f"brief-{date_str}", "\n".join(lines) + "\n" + body_text


def run_brief(settings: Settings) -> str | None:
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=WINDOW_DAYS)).isoformat()

    with db.connect(settings.db_path) as conn:
        db.init_db(conn)
        rows = db.enriched_since(conn, since, MAX_ITEMS)

    if not rows:
        print("  [info] no enriched articles in window — run `enrich` first.")
        return None

    print(f"  building brief from {len(rows)} items")
    overview = _overview(settings, rows)
    grouped = _group_by_topic(rows)
    slug, content = _render(now, overview, grouped)

    settings.articles_dir.mkdir(parents=True, exist_ok=True)
    out_path = settings.articles_dir / f"{slug}.md"
    out_path.write_text(content, encoding="utf-8")
    print(f"  wrote {out_path}")
    print(f"  -> renders at /insights/{slug}")
    return str(out_path)

"""LLM enrichment with Claude Haiku.

One call per un-enriched article. Forced tool-use guarantees a structured,
schema-validated result (no brittle JSON-from-prose parsing). Enrichment is
cached by article id, so re-runs never re-spend on already-processed items.
"""

from __future__ import annotations

from datetime import datetime, timezone

import anthropic

from . import db
from .config import Settings

TOPICS = [
    "payments", "ecommerce", "logistics", "consumers",
    "regulation", "stocks", "macro", "platforms", "other",
]

SYSTEM_PROMPT = (
    "You analyze Vietnamese market and business news for a neutral, reference-style "
    "knowledge base. Be factual and neutral: no hype, no marketing language, no "
    "predictions, no investment advice. Summaries must be faithful to the source text "
    "only — never invent figures. If a number is not in the source, do not state it."
)

ENRICH_TOOL = {
    "name": "record_enrichment",
    "description": "Record the structured analysis of one news article.",
    "input_schema": {
        "type": "object",
        "properties": {
            "summary_vn": {
                "type": "string",
                "description": "3 neutral sentences in Vietnamese summarizing the article.",
            },
            "summary_en": {
                "type": "string",
                "description": "3 neutral sentences in English summarizing the article.",
            },
            "topic": {"type": "string", "enum": TOPICS},
            "sentiment": {
                "type": "number",
                "description": "Market sentiment from -1 (negative) to 1 (positive).",
            },
            "entities": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "type": {
                            "type": "string",
                            "enum": ["company", "person", "gov", "sector"],
                        },
                        "ticker": {"type": "string"},
                    },
                    "required": ["name", "type"],
                },
            },
            "key_stats": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "label": {"type": "string"},
                        "value": {"type": "string"},
                        "unit": {"type": "string"},
                    },
                    "required": ["label", "value"],
                },
                "description": "Quantitative facts explicitly present in the source only.",
            },
            "importance": {
                "type": "integer",
                "minimum": 1,
                "maximum": 5,
                "description": "Newsworthiness for a market digest (5 = major).",
            },
        },
        "required": ["summary_vn", "summary_en", "topic", "sentiment", "importance"],
    },
}


def _enrich_one(client: anthropic.Anthropic, model: str, title: str, excerpt: str) -> dict | None:
    user_text = f"SOURCE TITLE: {title}\n\nSOURCE EXCERPT:\n{excerpt}"
    resp = client.messages.create(
        model=model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=[ENRICH_TOOL],
        tool_choice={"type": "tool", "name": "record_enrichment"},
        messages=[{"role": "user", "content": user_text}],
    )
    for block in resp.content:
        if block.type == "tool_use" and block.name == "record_enrichment":
            return dict(block.input)
    return None


def run_enrich(settings: Settings) -> int:
    if not settings.anthropic_api_key:
        print("  [error] ANTHROPIC_API_KEY not set (see pipeline/.env.example). Skipping.")
        return 0

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    enriched = 0
    failed = 0

    with db.connect(settings.db_path) as conn:
        db.init_db(conn)
        pending = db.unenriched_articles(conn, settings.enrich_limit)
        print(f"  pending={len(pending)} (limit={settings.enrich_limit}) model={settings.model}")

        for row in pending:
            excerpt = (row["raw_excerpt"] or "").strip()
            if len(excerpt) < 40:  # too thin to summarize faithfully
                continue
            try:
                data = _enrich_one(client, settings.model, row["title"], excerpt)
            except Exception as exc:
                failed += 1
                print(f"    [warn] enrich failed {row['url']} -> {exc}")
                continue
            if not data:
                failed += 1
                continue
            db.upsert_enrichment(
                conn, row["id"], data, settings.model,
                datetime.now(timezone.utc).isoformat(),
            )
            enriched += 1
            if enriched % 10 == 0:
                conn.commit()
                print(f"    …{enriched} enriched")

    print(f"  enriched={enriched} failed={failed}")
    return enriched

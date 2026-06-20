"""Aggregate enriched articles into daily trend snapshots.

Produces real time-series (topic + company mention counts with average
sentiment per day) so the site's trend data is no longer simulated. Idempotent:
re-running recomputes snapshots for the days present in the data.
"""

from __future__ import annotations

import json
from collections import defaultdict

from . import db
from .config import Settings


def _day(iso_or_date: str) -> str:
    # fetched_at is ISO ("2026-06-20T..."); take the date part.
    return (iso_or_date or "")[:10]


def run_aggregate(settings: Settings) -> int:
    """Rebuild trend_snapshots from the enrichment table. Returns rows written."""
    # bucket[(topic, term, date)] = [count, sentiment_sum]
    bucket: dict[tuple[str, str, str], list[float]] = defaultdict(lambda: [0.0, 0.0])

    with db.connect(settings.db_path) as conn:
        db.init_db(conn)
        rows = conn.execute(
            """
            SELECT a.fetched_at, e.topic, e.sentiment, e.entities
            FROM enrichment e JOIN articles a ON a.id = e.article_id
            """
        ).fetchall()

        for r in rows:
            date = _day(r["fetched_at"])
            if not date:
                continue
            sentiment = float(r["sentiment"] or 0.0)

            # Topic-level momentum (term == "__topic__").
            topic = r["topic"] or "other"
            key = (topic, "__topic__", date)
            bucket[key][0] += 1
            bucket[key][1] += sentiment

            # Company-level momentum (one row per company entity).
            try:
                entities = json.loads(r["entities"] or "[]")
            except json.JSONDecodeError:
                entities = []
            for ent in entities:
                if ent.get("type") == "company" and ent.get("name"):
                    ckey = (topic, ent["name"].strip(), date)
                    bucket[ckey][0] += 1
                    bucket[ckey][1] += sentiment

        conn.execute("DELETE FROM trend_snapshots")
        written = 0
        for (topic, term, date), (count, sent_sum) in bucket.items():
            avg = sent_sum / count if count else 0.0
            conn.execute(
                """
                INSERT OR REPLACE INTO trend_snapshots
                  (topic, term, date, mention_count, avg_sentiment)
                VALUES (?, ?, ?, ?, ?)
                """,
                (topic, term, date, int(count), round(avg, 3)),
            )
            written += 1

    print(f"  trend_snapshots rows={written}")
    return written

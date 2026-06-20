"""SQLite storage. Schema matches docs/AI-NEWS-PIPELINE-PLAN.md (§4).

Phase 0 populates `articles` only. `enrichment` and `trend_snapshots` are
created now so Phase 1 can write without a migration.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from .models import Article

SCHEMA = """
CREATE TABLE IF NOT EXISTS articles (
  id            TEXT PRIMARY KEY,
  url           TEXT UNIQUE,
  source        TEXT,
  title         TEXT,
  raw_excerpt   TEXT,
  pub_date      TEXT,
  fetched_at    TEXT,
  content_hash  TEXT,
  lang          TEXT,
  embedding     BLOB
);
CREATE INDEX IF NOT EXISTS idx_articles_content_hash ON articles(content_hash);
CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(pub_date);

CREATE TABLE IF NOT EXISTS enrichment (
  article_id  TEXT PRIMARY KEY REFERENCES articles(id),
  summary_vn  TEXT,
  summary_en  TEXT,
  topic       TEXT,
  sentiment   REAL,
  entities    TEXT,
  key_stats   TEXT,
  importance  INTEGER,
  model       TEXT,
  enriched_at TEXT
);

CREATE TABLE IF NOT EXISTS trend_snapshots (
  topic         TEXT,
  term          TEXT,
  date          TEXT,
  mention_count INTEGER,
  avg_sentiment REAL,
  PRIMARY KEY (topic, term, date)
);
"""


@contextmanager
def connect(db_path: Path) -> Iterator[sqlite3.Connection]:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)


def known_ids(conn: sqlite3.Connection) -> set[str]:
    return {row[0] for row in conn.execute("SELECT id FROM articles")}


def known_content_hashes(conn: sqlite3.Connection) -> set[str]:
    return {row[0] for row in conn.execute("SELECT content_hash FROM articles WHERE content_hash IS NOT NULL")}


def insert_article(conn: sqlite3.Connection, article: Article) -> bool:
    """Insert one article. Returns True if newly inserted, False if it existed."""
    cur = conn.execute(
        """
        INSERT OR IGNORE INTO articles
          (id, url, source, title, raw_excerpt, pub_date, fetched_at, content_hash, lang)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            article.id,
            article.url,
            article.source,
            article.title,
            article.raw_excerpt,
            article.pub_date,
            article.fetched_at,
            article.content_hash,
            article.lang,
        ),
    )
    return cur.rowcount > 0


def count_articles(conn: sqlite3.Connection) -> int:
    return conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]


def count_enriched(conn: sqlite3.Connection) -> int:
    return conn.execute("SELECT COUNT(*) FROM enrichment").fetchone()[0]


def unenriched_articles(conn: sqlite3.Connection, limit: int) -> list[sqlite3.Row]:
    """Articles with no enrichment row yet (cache by id => no re-spend)."""
    return conn.execute(
        """
        SELECT a.id, a.title, a.raw_excerpt, a.source, a.url, a.pub_date, a.lang
        FROM articles a
        LEFT JOIN enrichment e ON e.article_id = a.id
        WHERE e.article_id IS NULL
        ORDER BY a.fetched_at DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()


def upsert_enrichment(
    conn: sqlite3.Connection,
    article_id: str,
    data: dict,
    model: str,
    enriched_at: str,
) -> None:
    import json

    conn.execute(
        """
        INSERT OR REPLACE INTO enrichment
          (article_id, summary_vn, summary_en, topic, sentiment,
           entities, key_stats, importance, model, enriched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            article_id,
            data.get("summary_vn", ""),
            data.get("summary_en", ""),
            data.get("topic", ""),
            float(data.get("sentiment", 0.0)),
            json.dumps(data.get("entities", []), ensure_ascii=False),
            json.dumps(data.get("key_stats", []), ensure_ascii=False),
            int(data.get("importance", 1)),
            model,
            enriched_at,
        ),
    )


def articles_needing_embedding(conn: sqlite3.Connection, limit: int) -> list[sqlite3.Row]:
    """Enriched articles that have no embedding yet."""
    return conn.execute(
        """
        SELECT a.id, a.title, e.summary_en
        FROM articles a
        JOIN enrichment e ON e.article_id = a.id
        WHERE a.embedding IS NULL
        ORDER BY a.fetched_at DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()


def set_embedding(conn: sqlite3.Connection, article_id: str, blob: bytes) -> None:
    conn.execute("UPDATE articles SET embedding = ? WHERE id = ?", (blob, article_id))


def count_embedded(conn: sqlite3.Connection) -> int:
    return conn.execute("SELECT COUNT(*) FROM articles WHERE embedding IS NOT NULL").fetchone()[0]


def enriched_since(conn: sqlite3.Connection, since_iso: str, limit: int) -> list[sqlite3.Row]:
    """Enriched articles fetched on/after `since_iso`, ranked for the brief."""
    return conn.execute(
        """
        SELECT a.title, a.url, a.source, a.pub_date,
               e.summary_vn, e.summary_en, e.topic, e.sentiment,
               e.entities, e.key_stats, e.importance
        FROM enrichment e
        JOIN articles a ON a.id = e.article_id
        WHERE a.fetched_at >= ?
        ORDER BY e.importance DESC, a.fetched_at DESC
        LIMIT ?
        """,
        (since_iso, limit),
    ).fetchall()

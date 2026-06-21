#!/usr/bin/env python
"""Quick look at what Phase 0 stored. Usage: python inspect_db.py [limit]"""

import sys

sys.stdout.reconfigure(encoding="utf-8")

from vnnews import db
from vnnews.config import load_settings


def main() -> None:
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    settings = load_settings()
    with db.connect(settings.db_path) as conn:
        db.init_db(conn)
        total = db.count_articles(conn)
        print(f"Total articles: {total}\n")

        by_source = conn.execute(
            "SELECT source, COUNT(*) c FROM articles GROUP BY source ORDER BY c DESC"
        ).fetchall()
        for row in by_source:
            print(f"  {row['source']:<14} {row['c']}")

        print(f"\nMost recent {limit}:")
        rows = conn.execute(
            "SELECT source, title, pub_date, length(raw_excerpt) ex "
            "FROM articles ORDER BY fetched_at DESC, pub_date DESC LIMIT ?",
            (limit,),
        ).fetchall()
        for row in rows:
            print(f"  [{row['source']}] ({row['ex']} chars) {row['title'][:90]}")


if __name__ == "__main__":
    main()

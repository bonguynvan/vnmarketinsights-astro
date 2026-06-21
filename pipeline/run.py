#!/usr/bin/env python
"""Entry point.

Usage:
  python run.py            # crawl (Phase 0)
  python run.py crawl
  python run.py enrich     # Phase 1 — needs ANTHROPIC_API_KEY
  python run.py brief
  python run.py all
"""

import sys

# Vietnamese titles need UTF-8 stdout (Windows console defaults to cp1252).
sys.stdout.reconfigure(encoding="utf-8")

from vnnews.pipeline import run

if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else "crawl")

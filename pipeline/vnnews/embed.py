"""Embeddings via Gemini text-embedding-004.

Embeds enriched articles (title + English summary) into a normalized vector,
stored as float32 bytes in articles.embedding. Cached: only articles without an
embedding are processed. The query is embedded with the SAME model + dims at
search time (src/utils/newsSearch.ts), so vectors share one space.

Why Gemini embeddings (not a local model): no torch/onnx in CI, one cheap HTTP
call per item, and the query side can embed in plain TS with the same endpoint.
"""

from __future__ import annotations

import array
import math

import httpx

from . import db
from .config import Settings

ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent?key={key}"


def _normalize(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def embed_text(client: httpx.Client, settings: Settings, text: str) -> list[float] | None:
    url = ENDPOINT.format(model=settings.embed_model, key=settings.gemini_api_key)
    body = {
        "model": f"models/{settings.embed_model}",
        "content": {"parts": [{"text": text[:2000]}]},
        "outputDimensionality": settings.embed_dims,
    }
    resp = client.post(url, json=body, timeout=30)
    resp.raise_for_status()
    values = resp.json().get("embedding", {}).get("values")
    return _normalize(values) if values else None


def run_embed(settings: Settings) -> int:
    if not settings.gemini_api_key:
        print("  [error] GEMINI_API_KEY not set — skipping embeddings. "
              "Semantic search will fall back to keyword match.")
        return 0

    embedded = 0
    failed = 0
    with httpx.Client() as client, db.connect(settings.db_path) as conn:
        db.init_db(conn)
        pending = db.articles_needing_embedding(conn, settings.enrich_limit * 4)
        print(f"  pending={len(pending)} model={settings.embed_model} dims={settings.embed_dims}")

        for row in pending:
            text = f"{row['title']}. {row['summary_en'] or ''}".strip()
            if len(text) < 10:
                continue
            try:
                vec = embed_text(client, settings, text)
            except Exception as exc:
                failed += 1
                print(f"    [warn] embed failed {row['id'][:10]} -> {exc}")
                continue
            if not vec:
                failed += 1
                continue
            blob = array.array("f", vec).tobytes()
            db.set_embedding(conn, row["id"], blob)
            embedded += 1
            if embedded % 20 == 0:
                conn.commit()
                print(f"    …{embedded} embedded")

    print(f"  embedded={embedded} failed={failed}")
    return embedded

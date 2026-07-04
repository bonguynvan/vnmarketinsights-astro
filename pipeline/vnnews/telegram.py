"""Daily headline push to a public Telegram channel.

Posts the day's most important English headlines (from the enriched corpus) to
`TELEGRAM_CHANNEL` via `TELEGRAM_BOT_TOKEN`. Best-effort and env-gated: if either
secret is unset it no-ops; any failure logs a warning and never breaks the
pipeline. A once-per-UTC-day guard (in data/notify-state.json) keeps re-runs and
manual dispatches from double-posting.

Audience is English, so items use the enriched English summary — never the
original Vietnamese source title.
"""

from __future__ import annotations

import html
import json
from datetime import datetime, timezone
from pathlib import Path

import httpx

from . import db
from .config import Settings

STATE_FILE = "notify-state.json"
SITE_URL = "https://vnmarketinsights.com/insights/"
TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"

RECENT_WINDOW = 40      # newest enriched articles to consider
HEADLINE_COUNT = 6      # top items to post, ranked by importance
SUMMARY_MAX_CHARS = 180


def _state_path(settings: Settings) -> Path:
    return settings.db_path.parent / STATE_FILE


def _load_state(settings: Settings) -> dict:
    path = _state_path(settings)
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def _save_state(settings: Settings, state: dict) -> None:
    _state_path(settings).write_text(
        json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _top_headlines(conn) -> list[dict]:
    rows = conn.execute(
        """
        SELECT a.url, a.source,
               e.summary_en, e.topic, e.importance
        FROM enrichment e JOIN articles a ON a.id = e.article_id
        WHERE e.summary_en IS NOT NULL AND TRIM(e.summary_en) != ''
        ORDER BY a.fetched_at DESC
        LIMIT ?
        """,
        (RECENT_WINDOW,),
    ).fetchall()
    items = [
        {
            "url": r["url"],
            "source": r["source"],
            "summary_en": r["summary_en"].strip(),
            "topic": r["topic"] or "",
            "importance": r["importance"] or 0,
        }
        for r in rows
    ]
    # Most important first; recency (query order) breaks ties.
    items.sort(key=lambda it: it["importance"], reverse=True)
    return items[:HEADLINE_COUNT]


def _truncate(text: str, limit: int = SUMMARY_MAX_CHARS) -> str:
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def _format_message(items: list[dict], date_label: str) -> str:
    lines = [f"📊 <b>Vietnam Market — Daily Headlines</b>", f"<i>{date_label}</i>", ""]
    for it in items:
        summary = html.escape(_truncate(it["summary_en"]))
        source = html.escape(it["source"] or "source")
        url = html.escape(it["url"], quote=True)
        lines.append(f"• <a href=\"{url}\">{summary}</a>")
        lines.append(f"  <i>{source}</i>")
        lines.append("")
    lines.append(f"Full coverage &amp; analysis → {SITE_URL}")
    return "\n".join(lines)


def run_telegram(settings: Settings) -> bool:
    if not settings.telegram_bot_token or not settings.telegram_channel:
        print("  [info] TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL not set — skipping Telegram push.")
        return False

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    state = _load_state(settings)
    if state.get("last_telegram_date") == today:
        print(f"  [info] Telegram already posted for {today} — skipping (daily guard).")
        return False

    with db.connect(settings.db_path) as conn:
        db.init_db(conn)
        items = _top_headlines(conn)

    if not items:
        print("  [info] no enriched English headlines to post — skipping Telegram.")
        return False

    message = _format_message(items, date_label=today)
    try:
        resp = httpx.post(
            TELEGRAM_API.format(token=settings.telegram_bot_token),
            json={
                "chat_id": settings.telegram_channel,
                "text": message,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=20,
        )
        resp.raise_for_status()
    except Exception as exc:
        # Best-effort: never break the pipeline on a delivery failure.
        print(f"  [warn] Telegram push failed -> {exc}")
        return False

    state["last_telegram_date"] = today
    state["last_telegram_at"] = datetime.now(timezone.utc).isoformat()
    _save_state(settings, state)
    print(f"  posted {len(items)} headlines to Telegram {settings.telegram_channel}")
    return True

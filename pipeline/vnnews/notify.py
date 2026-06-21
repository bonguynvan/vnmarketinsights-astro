"""Newsletter hook with a weekly send-guard.

Posts the latest brief to LEAD_WEBHOOK_URL (the same env var the Astro lead
system uses) so your email/CRM automation can send the digest. The pipeline may
run daily, but we send at most once per ISO week — the guard records the last
sent brief slug in data/notify-state.json. No-op if the URL is unset.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import httpx

from .config import Settings

STATE_FILE = "notify-state.json"


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


def _latest_en_brief(settings: Settings) -> Path | None:
    # EN briefs only (exclude *-vi.md); newest by name (brief-YYYY-wWW.md sorts).
    briefs = sorted(
        p for p in settings.articles_dir.glob("brief-*.md") if not p.stem.endswith("-vi")
    )
    return briefs[-1] if briefs else None


def run_notify(settings: Settings) -> bool:
    if not settings.lead_webhook_url:
        print("  [info] LEAD_WEBHOOK_URL not set — skipping newsletter notify.")
        return False

    latest = _latest_en_brief(settings)
    if latest is None:
        print("  [info] no brief found to notify.")
        return False

    slug = latest.stem
    state = _load_state(settings)
    if state.get("last_sent_slug") == slug:
        print(f"  [info] {slug} already sent — skipping (weekly guard).")
        return False

    text = latest.read_text(encoding="utf-8")
    title = next(
        (ln.split('"')[1] for ln in text.splitlines() if ln.startswith("title:")),
        slug,
    )
    payload = {
        "type": "weekly_brief",
        "slug": slug,
        "title": title,
        "url": f"https://vnmarketinsights.com/insights/{slug}/",
        "markdown": text,
    }
    try:
        resp = httpx.post(settings.lead_webhook_url, json=payload, timeout=20)
        resp.raise_for_status()
    except Exception as exc:
        print(f"  [warn] notify failed -> {exc}")
        return False

    state["last_sent_slug"] = slug
    state["last_sent_at"] = datetime.now(timezone.utc).isoformat()
    _save_state(settings, state)
    print(f"  notified webhook for {slug} (status {resp.status_code})")
    return True

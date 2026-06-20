"""Optional newsletter hook.

Posts a compact payload for the latest brief to LEAD_WEBHOOK_URL (the same
env var the Astro lead system uses), so your existing email/CRM automation can
send the digest. No-op if the URL is unset.
"""

from __future__ import annotations

from pathlib import Path

import httpx

from .config import Settings


def run_notify(settings: Settings) -> bool:
    if not settings.lead_webhook_url:
        print("  [info] LEAD_WEBHOOK_URL not set — skipping newsletter notify.")
        return False

    briefs = sorted(settings.articles_dir.glob("brief-*.md"))
    if not briefs:
        print("  [info] no brief found to notify.")
        return False

    latest: Path = briefs[-1]
    slug = latest.stem
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
        print(f"  notified webhook for {slug} (status {resp.status_code})")
        return True
    except Exception as exc:
        print(f"  [warn] notify failed -> {exc}")
        return False

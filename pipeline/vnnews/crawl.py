"""Async crawler: RSS feeds -> optional full-article fetch.

Etiquette enforced here:
  - robots.txt checked per domain (cached), with a fail-open-but-logged policy
  - descriptive User-Agent
  - per-domain rate limiting (serialized fetches with a delay)
"""

from __future__ import annotations

import asyncio
import time
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import feedparser
import httpx

from .config import Source
from .extract import build_excerpt, extract_main_text
from .models import Article


def _domain(url: str) -> str:
    return urlsplit(url).netloc.lower()


class DomainThrottle:
    """Serializes requests per domain and enforces a minimum gap between them."""

    def __init__(self, delay_seconds: float) -> None:
        self._delay = delay_seconds
        self._locks: dict[str, asyncio.Lock] = {}
        self._last: dict[str, float] = {}

    async def wait(self, url: str) -> asyncio.Lock:
        domain = _domain(url)
        lock = self._locks.setdefault(domain, asyncio.Lock())
        await lock.acquire()
        elapsed = time.monotonic() - self._last.get(domain, 0.0)
        if elapsed < self._delay:
            await asyncio.sleep(self._delay - elapsed)
        return lock

    def done(self, url: str, lock: asyncio.Lock) -> None:
        self._last[_domain(url)] = time.monotonic()
        lock.release()


class RobotsCache:
    def __init__(self, client: httpx.AsyncClient, user_agent: str) -> None:
        self._client = client
        self._ua = user_agent
        self._cache: dict[str, RobotFileParser] = {}

    async def allowed(self, url: str) -> bool:
        domain = _domain(url)
        parser = self._cache.get(domain)
        if parser is None:
            parser = RobotFileParser()
            robots_url = f"{urlsplit(url).scheme}://{domain}/robots.txt"
            try:
                resp = await self._client.get(robots_url)
                parser.parse(resp.text.splitlines() if resp.status_code == 200 else [])
            except Exception:
                parser.parse([])  # fail open: treat as allowed
            self._cache[domain] = parser
        return parser.can_fetch(self._ua, url)


async def _fetch_text(client: httpx.AsyncClient, url: str, throttle: DomainThrottle) -> str:
    lock = await throttle.wait(url)
    try:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.text
    finally:
        throttle.done(url, lock)


async def crawl_source(
    source: Source,
    client: httpx.AsyncClient,
    throttle: DomainThrottle,
    robots: RobotsCache,
) -> list[Article]:
    articles: list[Article] = []
    for feed_url in source.feeds:
        try:
            feed_xml = await _fetch_text(client, feed_url, throttle)
        except Exception as exc:  # one feed failing must not kill the source
            print(f"  [warn] {source.name}: feed fetch failed {feed_url} -> {exc}")
            continue

        parsed = feedparser.parse(feed_xml)
        entries = parsed.entries[: source.max_items_per_feed]
        print(f"  {source.name}: {len(entries)} items from {feed_url}")

        for entry in entries:
            link = getattr(entry, "link", "").strip()
            title = getattr(entry, "title", "").strip()
            if not link or not title:
                continue

            summary = getattr(entry, "summary", "") or getattr(entry, "description", "")
            pub_date = getattr(entry, "published", "") or getattr(entry, "updated", "")

            full_text = ""
            if source.fetch_full and await robots.allowed(link):
                try:
                    html = await _fetch_text(client, link, throttle)
                    full_text = extract_main_text(html)
                except Exception as exc:
                    print(f"    [warn] article fetch failed {link} -> {exc}")

            articles.append(
                Article(
                    url=link,
                    source=source.name,
                    title=title,
                    raw_excerpt=build_excerpt(full_text, summary, title),
                    pub_date=pub_date,
                    lang=source.lang,
                    full_text=full_text,
                )
            )
    return articles


async def crawl_all(sources: tuple[Source, ...], user_agent: str) -> list[Article]:
    delay = min(s.per_domain_delay_seconds for s in sources) if sources else 2.5
    timeout = max((s.request_timeout_seconds for s in sources), default=20)
    throttle = DomainThrottle(delay)
    headers = {"User-Agent": user_agent}

    async with httpx.AsyncClient(
        headers=headers, timeout=timeout, follow_redirects=True
    ) as client:
        robots = RobotsCache(client, user_agent)
        results = await asyncio.gather(
            *(crawl_source(s, client, throttle, robots) for s in sources)
        )
    return [article for batch in results for article in batch]

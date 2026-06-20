"""Configuration loading: sources registry + environment."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import yaml
from dotenv import load_dotenv

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_USER_AGENT = "vnmarketinsights-bot/0.1 (+https://vnmarketinsights.com)"

load_dotenv(PIPELINE_ROOT / ".env")


@dataclass(frozen=True)
class Source:
    name: str
    lang: str
    topic_hint: str
    feeds: tuple[str, ...]
    per_domain_delay_seconds: float
    request_timeout_seconds: float
    max_items_per_feed: int
    fetch_full: bool


@dataclass(frozen=True)
class Settings:
    db_path: Path
    user_agent: str
    sources: tuple[Source, ...]
    anthropic_api_key: str
    model: str
    enrich_limit: int
    articles_dir: Path
    lead_webhook_url: str


def _load_sources(path: Path) -> tuple[Source, ...]:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    defaults = raw.get("defaults", {})
    sources: list[Source] = []
    for entry in raw.get("sources", []):
        sources.append(
            Source(
                name=entry["name"],
                lang=entry.get("lang", "vi"),
                topic_hint=entry.get("topic_hint", ""),
                feeds=tuple(entry.get("feeds", [])),
                per_domain_delay_seconds=float(
                    entry.get("per_domain_delay_seconds", defaults.get("per_domain_delay_seconds", 2.5))
                ),
                request_timeout_seconds=float(
                    entry.get("request_timeout_seconds", defaults.get("request_timeout_seconds", 20))
                ),
                max_items_per_feed=int(
                    entry.get("max_items_per_feed", defaults.get("max_items_per_feed", 25))
                ),
                fetch_full=bool(entry.get("fetch_full", defaults.get("fetch_full", True))),
            )
        )
    return tuple(sources)


DEFAULT_MODEL = "claude-haiku-4-5-20251001"


def _resolve(path_value: str) -> Path:
    path = Path(path_value)
    return path if path.is_absolute() else (PIPELINE_ROOT / path).resolve()


def load_settings(sources_file: str = "sources.yaml") -> Settings:
    return Settings(
        db_path=_resolve(os.getenv("VNNEWS_DB_PATH", "data/news.db")),
        user_agent=os.getenv("VNNEWS_USER_AGENT", DEFAULT_USER_AGENT),
        sources=_load_sources(PIPELINE_ROOT / sources_file),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        model=os.getenv("VNNEWS_MODEL", DEFAULT_MODEL),
        enrich_limit=int(os.getenv("VNNEWS_ENRICH_LIMIT", "40")),
        articles_dir=_resolve(os.getenv("VNNEWS_ARTICLES_DIR", "../src/content/articles")),
        lead_webhook_url=os.getenv("LEAD_WEBHOOK_URL", ""),
    )

"""Weekly brief generator.

Selects the most important enriched articles from the last 7 days, groups them
by topic, and writes a Markdown file into the Astro content collection. The
frontmatter matches src/content/config.ts exactly, so /insights/<slug> renders
it with zero Astro changes.

Body is built deterministically from stored enrichment (summaries + source
links — attribution preserved, no full bodies). One short LLM call writes a
neutral executive overview; falls back to a template if no API key.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import anthropic

from . import db
from .config import Settings

TOPIC_LABELS = {
    "payments": "Payments", "ecommerce": "E-commerce", "logistics": "Logistics",
    "consumers": "Consumers", "regulation": "Regulation", "stocks": "Stock Market",
    "macro": "Macroeconomy", "platforms": "Platforms", "other": "Other",
}
TOPIC_LABELS_VI = {
    "payments": "Thanh toán", "ecommerce": "Thương mại điện tử", "logistics": "Logistics",
    "consumers": "Người tiêu dùng", "regulation": "Pháp lý", "stocks": "Chứng khoán",
    "macro": "Kinh tế vĩ mô", "platforms": "Nền tảng", "other": "Khác",
}
WINDOW_DAYS = 7
MAX_ITEMS = 25
INTRO_INPUT_ITEMS = 12

# Per-language presentation strings keep _render free of inline conditionals.
LANG = {
    "en": {
        "labels": TOPIC_LABELS,
        "title": lambda d: f"Vietnam Market Brief — {d.strftime('%B %d, %Y')}",
        "desc": lambda w, y: f"Weekly digest of Vietnam market and business news, week {w} {y}, grouped by topic with sources.",
        "overview": "Overview",
        "summary_key": "summary_en",
        "key_figures": "Key figures",
        "source": "Source",
        "disclaimer": "*Summaries are AI-generated from public news sources and link to the originals. Neutral, factual, not investment advice.*",
        "sys": "You write neutral, factual market-news overviews in English. No hype, no predictions, no investment advice. 2-3 sentences only.",
        "ask": "Write a 2-3 sentence neutral overview of this week's Vietnam market news based ONLY on these summaries:\n\n",
        "fallback": "This brief summarizes the most notable developments in Vietnam's market and business news over the past week, grouped by topic. Each item links to its original source.",
    },
    "vi": {
        "labels": TOPIC_LABELS_VI,
        "title": lambda d: f"Bản tin Thị trường Việt Nam — {d.strftime('%d/%m/%Y')}",
        "desc": lambda w, y: f"Tổng hợp tin tức thị trường và kinh doanh Việt Nam, tuần {w} năm {y}, phân nhóm theo chủ đề kèm nguồn.",
        "overview": "Tổng quan",
        "summary_key": "summary_vn",
        "key_figures": "Số liệu chính",
        "source": "Nguồn",
        "disclaimer": "*Các tóm tắt được tạo bằng AI từ nguồn tin công khai và dẫn link bài gốc. Trung lập, dựa trên dữ kiện, không phải lời khuyên đầu tư.*",
        "sys": "Bạn viết phần tổng quan tin tức thị trường trung lập, dựa trên dữ kiện, bằng tiếng Việt. Không phóng đại, không dự đoán, không khuyến nghị đầu tư. Chỉ 2-3 câu.",
        "ask": "Viết phần tổng quan 2-3 câu trung lập về tin tức thị trường Việt Nam tuần này, CHỈ dựa trên các tóm tắt sau:\n\n",
        "fallback": "Bản tin tổng hợp những diễn biến đáng chú ý nhất của thị trường và kinh doanh Việt Nam trong tuần qua, phân nhóm theo chủ đề. Mỗi mục đều dẫn về nguồn gốc.",
    },
}


def _overview(settings: Settings, rows: list, lang: str) -> str:
    cfg = LANG[lang]
    headlines = [f"- ({cfg['labels'].get(r['topic'], r['topic'])}) {r[cfg['summary_key']]}"
                 for r in rows[:INTRO_INPUT_ITEMS]]
    if not settings.anthropic_api_key:
        return cfg["fallback"]
    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        resp = client.messages.create(
            model=settings.model,
            max_tokens=500,
            system=cfg["sys"],
            messages=[{"role": "user", "content": cfg["ask"] + "\n".join(headlines)}],
        )
        text = "".join(b.text for b in resp.content if b.type == "text").strip()
        return text or cfg["fallback"]
    except Exception as exc:
        print(f"  [warn] overview generation failed ({lang}) -> {exc}")
        return cfg["fallback"]


def _group_by_topic(rows: list) -> dict[str, list]:
    grouped: dict[str, list] = {}
    for row in rows:
        grouped.setdefault(row["topic"] or "other", []).append(row)
    # stable, label-ordered
    return {k: grouped[k] for k in TOPIC_LABELS if k in grouped}


def _render(date: datetime, overview: str, grouped: dict[str, list], lang: str) -> tuple[str, str]:
    cfg = LANG[lang]
    date_str = date.strftime("%Y-%m-%d")
    iso_week = date.isocalendar()
    title = cfg["title"](date)
    description = cfg["desc"](iso_week.week, iso_week.year)
    # EN keeps the canonical slug; VN gets a -vi suffix.
    slug = f"brief-{date_str}" if lang == "en" else f"brief-{date_str}-vi"
    summary_key = cfg["summary_key"]

    lines = [
        "---",
        f'title: "{title}"',
        f'description: "{description}"',
        f'publishedDate: "{date_str}"',
        f'lastUpdated: "{date_str}"',
        'category: "Market Brief"',
    ]

    body = [f"# {title}\n", f"## {cfg['overview']}\n", overview + "\n"]
    for topic, items in grouped.items():
        body.append(f"## {cfg['labels'][topic]}\n")
        for r in items:
            body.append(f"**{r['title']}**  ")
            body.append(f"\n{r[summary_key] or r['summary_en']}\n")
            stats = json.loads(r["key_stats"] or "[]")
            if stats:
                facts = "; ".join(
                    f"{s.get('label')}: {s.get('value')}{(' ' + s['unit']) if s.get('unit') else ''}"
                    for s in stats[:4]
                )
                body.append(f"- {cfg['key_figures']}: {facts}")
            body.append(f"- {cfg['source']}: [{r['source']}]({r['url']})\n")

    body.append("---\n")
    body.append(cfg["disclaimer"] + "\n")

    body_text = "\n".join(body)
    words = len(body_text.split())
    lines.append(f"readingTime: {max(1, round(words / 200))}")
    lines.append("---\n")
    return slug, "\n".join(lines) + "\n" + body_text


def run_brief(settings: Settings) -> str | None:
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=WINDOW_DAYS)).isoformat()

    with db.connect(settings.db_path) as conn:
        db.init_db(conn)
        rows = db.enriched_since(conn, since, MAX_ITEMS)

    if not rows:
        print("  [info] no enriched articles in window — run `enrich` first.")
        return None

    print(f"  building EN + VI briefs from {len(rows)} items")
    grouped = _group_by_topic(rows)
    settings.articles_dir.mkdir(parents=True, exist_ok=True)

    en_path: str | None = None
    for lang in ("en", "vi"):
        overview = _overview(settings, rows, lang)
        slug, content = _render(now, overview, grouped, lang)
        out_path = settings.articles_dir / f"{slug}.md"
        out_path.write_text(content, encoding="utf-8")
        print(f"  wrote {out_path}  -> /insights/{slug}")
        if lang == "en":
            en_path = str(out_path)
    return en_path

# AI News Pipeline — Plan

**Status:** Proposed
**Owner:** bonguynvan
**Decisions locked:** Python single service · Commit Markdown back to repo · Free-tier-first
**Last updated:** 2026-06-20

---

## 1. Problem & Goal

### Today (the ceiling)
The "news + AI" layer lives **inline in Astro serverless functions** and is recomputed on every request:

- `src/utils/newsFeed.ts` — fetches **2 RSS feeds** (VnExpress `kinh-doanh`, CafeF) *at request time*, parses with **regex**, keyword sentiment, then calls **Gemini 1.5 Flash live** for synthesis (template fallback).
- `src/utils/trendEngine.ts` + `dataSources.ts` — trend data is **mostly simulated** (`SIMULATED_TREND_DATA`).
- No persistence (only `data/leads.json`). No history → no real trends. No dedup, no full-text, no entity extraction.

**Consequences:** LLM cost scales with pageviews; multi-second cold responses; rate-limit/IP-block risk; nothing compounds into ownable content; SEO freshness signal is wasted.

### Goal
Build a **decoupled Python pipeline** that crawls Vietnamese market news on a schedule, enriches it once with AI, and **commits Markdown/JSON back into the Astro repo** so the static site reads precomputed, deep, unique content at **~$0 runtime cost**.

### Success metrics (90 days)
- 1 auto-published daily/weekly brief, EN + VN, live on `/insights`.
- ≥ 30 source-backed enriched articles/briefs indexed by Google.
- "Recent developments" block live on all topic pages, auto-updated.
- Real (non-simulated) trend time-series powering `/trends`.
- Newsletter (existing double-opt-in lead system) sending the brief.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  vnmarket-pipeline/  (separate Python repo OR /pipeline dir)  │
│  Runs on GitHub Actions cron (free). No always-on server.     │
│                                                                │
│  1 crawl ──► 2 extract ──► 3 dedup ──► 4 enrich ──► 5 store    │
│    RSS+HTML    full text     content    LLM:           SQLite  │
│    ~15 srcs    (trafilatura) hash+URL   summary,       /Turso  │
│                              + embed    topic, senti., +files  │
│                              cosine     entities,             │
│                                         stats, EN xlate,      │
│                                         embeddings           │
│                                  │                            │
│  6 publish ◄─────────────────────┘                           │
│    write .md → src/content/articles/ (briefs, entity pages)   │
│    write .json → src/data/ (trends, recent-by-topic, search)  │
│    git commit + push                                          │
└───────────────────────────────┬──────────────────────────────┘
                                 │ push triggers Vercel rebuild
                                 ▼
                ASTRO  (unchanged role: fast static reader)
   reads src/content/articles/*.md  +  src/data/*.json
```

**Key principle:** expensive work happens **once per new article**, offline. Astro never calls an LLM at request time. We can later retire the live `newsFeed.ts` LLM path entirely.

### Why a separate service (not more serverless)
1. Serverless is request-scoped & stateless → can't store history, re-does work per view.
2. Cron + a real DB gives time-series (real trends) and dedup.
3. Full-text extraction + LLM enrichment is batch work, not request work.
4. Content committed to the repo **compounds** and is version-controlled.

### Why Python single service
- Best LLM/embeddings ecosystem; Vietnamese NLP (`underthesea`, `pyvi`) is Python-only.
- One venv = minimal ops for a solo project. (Add a Go crawler later only if crawl scale/cost becomes the bottleneck — not now.)

---

## 3. Sources (crawl targets)

Start with RSS (cheap, legal-friendly), expand to full-article fetch of the linked pages.

| Source | Feed / area | Lang |
|---|---|---|
| VnExpress | `kinh-doanh.rss`, `chung-khoan` (already used) | VN |
| CafeF | `kinh-doanh.rss`, `thi-truong-chung-khoan` (already used) | VN |
| VietnamNet | business RSS | VN |
| Tuoi Tre | kinh-doanh RSS | VN |
| Thanh Nien | kinh-te RSS | VN |
| Vietstock | markets | VN |
| The Investor / VnEconomy | macro, FDI | VN/EN |
| Vietnam Briefing | policy, FDI (EN) | EN |
| Tuoi Tre News / VnExpress International | EN editions | EN |

**Crawling etiquette (must-do):** respect `robots.txt`, set a descriptive User-Agent, rate-limit per domain (e.g. ≥2s gap), cache by URL hash, store only summaries + links (never republish full copyrighted text). Output is **our own AI synthesis with attribution + source link**, not scraped article bodies.

---

## 4. Data model

SQLite (file, committed or in Turso free tier). One table for raw articles, one for enrichment, one for trend snapshots.

```sql
CREATE TABLE articles (
  id            TEXT PRIMARY KEY,        -- sha256(canonical_url)
  url           TEXT UNIQUE,
  source        TEXT,
  title         TEXT,
  raw_excerpt   TEXT,                    -- cleaned, <=500 chars; NOT full body
  pub_date      TEXT,
  fetched_at    TEXT,
  content_hash  TEXT,                    -- sha256(normalized text) for dedup
  embedding     BLOB                     -- for semantic dedup + search
);

CREATE TABLE enrichment (
  article_id    TEXT REFERENCES articles(id),
  summary_vn    TEXT,
  summary_en    TEXT,
  topic         TEXT,    -- payments|ecommerce|logistics|stocks|macro|regulation|...
  sentiment     REAL,    -- -1..1
  entities      JSON,    -- [{name, type: company|person|gov|sector, ticker?}]
  key_stats     JSON,    -- [{label, value, unit}]
  importance    INTEGER, -- 1..5 (LLM-scored newsworthiness, for ranking briefs)
  model         TEXT,
  enriched_at   TEXT
);

CREATE TABLE trend_snapshots (
  topic         TEXT,
  term          TEXT,
  date          TEXT,
  mention_count INTEGER,
  avg_sentiment REAL,
  PRIMARY KEY (topic, term, date)
);
```

Mapping to **existing Astro schema** (`src/content/config.ts`): generated briefs/entity pages use the current frontmatter (`title, description, publishedDate, lastUpdated, category, readingTime`) so `insights/[slug].astro` renders them with **zero Astro changes**.

---

## 5. Pipeline stages

1. **Crawl** — `httpx` async, per-domain rate limit, RSS first then fetch each linked article HTML.
2. **Extract** — `trafilatura`/`readability-lxml` for clean main text (replaces brittle regex in `newsFeed.ts`).
3. **Dedup** — exact `content_hash` + semantic (cosine on embeddings > 0.92 = duplicate cluster). Cluster near-duplicate coverage of the same event.
4. **Enrich (LLM)** — one batched call per article (see prompts §6). Cheap model (Gemini Flash / Claude Haiku). Cost-aware: skip if `article_id` already enriched.
5. **Store** — write to SQLite; append `trend_snapshots` (daily mention counts per term/topic → **real** trends).
6. **Publish** —
   - Daily/weekly **brief** → `src/content/articles/brief-YYYY-MM-DD.md` (EN + VN sections).
   - **Entity pages** (top companies) → `src/content/articles/company-<slug>.md`, rebuilt as news accrues.
   - `src/data/recent-by-topic.json` → consumed by topic pages' "Recent developments" block.
   - `src/data/trends.json` → replaces `SIMULATED_TREND_DATA` feeding `/trends`.
   - `git add/commit/push` → Vercel rebuild.

---

## 6. LLM prompts (enrichment contract)

Single structured call per article, JSON output (validate before store):

```
SYSTEM: You analyze Vietnamese market news. Neutral, factual, no hype, no predictions
(matches site content guidelines in README). Output strict JSON.

USER: <title> + <clean_text>
Return:
{
  "summary_vn": "3 neutral sentences in Vietnamese",
  "summary_en": "3 neutral sentences in English",
  "topic": "one of: payments|ecommerce|logistics|consumers|regulation|stocks|macro|platforms",
  "sentiment": -1..1,
  "entities": [{"name","type","ticker?"}],
  "key_stats": [{"label","value","unit"}],
  "importance": 1..5
}
```

Brief generator: take top-N by `importance` over the window, group by topic, ask LLM to weave a neutral digest with inline source attributions. Reuse the structure of existing `briefGenerator.ts`.

---

## 7. Deployment & cost (~$0)

| Component | Choice | Cost |
|---|---|---|
| Scheduler | **GitHub Actions cron** (e.g. daily 06:00 ICT) | Free |
| Compute | Actions runner (ephemeral) | Free |
| DB | SQLite committed, or **Turso** free tier | $0 |
| LLM | Gemini Flash / Claude Haiku, batch, cache by id | cents/day |
| Embeddings | Gemini / local `sentence-transformers` | $0–cents |
| Publish | git push → existing Vercel build | Free |

Secrets via GitHub Actions secrets (LLM key). No new always-on infra.

---

## 8. Growth ideas this unlocks (prioritized)

1. **Daily/Weekly brief → newsletter.** Highest leverage. Reuses existing double-opt-in lead system (`/api/leads/*`). One artifact → SEO page + email.
2. **English summaries of VN news.** Low-competition, high-value for foreign investors/researchers. Biggest content moat.
3. **Auto-built entity/company pages** (MoMo, VNG, Shopee, Techcombank…). Long-tail SEO that compounds with every mention.
4. **Real Trend Radar** — stored history makes `/trends` true, with charts.
5. **"Recent developments" block** on every topic page → freshness signal lifts existing rankings.
6. **Semantic search** over enriched corpus (embeddings already stored).
7. **Data-as-product** — clean JSON/RSS API of enriched VN market news.

---

## 9. Roadmap

**Phase 0 — Scaffold (week 1)**
- `pipeline/` dir or sibling repo, Python env, `.env`, source registry, SQLite schema.
- Crawl + extract + store (no LLM yet). Verify dedup.

**Phase 1 — Enrich + first brief (week 2)**
- LLM enrichment with JSON validation + id caching.
- Generate one `brief-*.md`, open PR, confirm it renders at `/insights/<slug>`.
- GitHub Actions cron live.

**Phase 2 — Surfaces (week 3–4)**
- `recent-by-topic.json` + topic-page block.
- `trends.json` replaces simulated data.
- Entity pages for top 10 companies.

**Phase 3 — Distribution (week 5+)**
- Wire brief into newsletter via existing `LEAD_WEBHOOK_URL`.
- EN/VN split, semantic search endpoint, retire live LLM path in `newsFeed.ts`.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Copyright (republishing) | Store/publish only **our** AI summaries + attribution + source link; never full article bodies. |
| Source HTML changes / blocks | RSS-first, per-domain rate limit, graceful per-source failure, descriptive UA, `robots.txt` respect. |
| LLM hallucinated stats | Keep `key_stats` tied to source; neutral-tone prompt; mark AI-generated; human spot-check before Phase 3. |
| Cost creep | Cache by `article_id`, cheap models, batch, importance-filter before brief generation. |
| Content quality / SEO penalty | Editorial gate on briefs early; unique synthesis + EN angle = genuinely additive, not thin content. |

---

## 11. Open questions

- Separate repo vs `pipeline/` subdir in this repo? (Subdir = simplest cron + commit; recommended to start.)
- Turso vs committed SQLite? (Committed SQLite simplest for Phase 0–1.)
- Cron cadence: daily brief vs weekly to start? (Weekly first, daily once quality is proven.)

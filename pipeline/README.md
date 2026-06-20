# vnnews pipeline

Decoupled Python pipeline that crawls Vietnamese market news, enriches it with
AI, and (later) commits Markdown/JSON back into the Astro site. See the full
design in [`../docs/AI-NEWS-PIPELINE-PLAN.md`](../docs/AI-NEWS-PIPELINE-PLAN.md).

**Phase 0:** `crawl → extract → dedup → store` into SQLite. No secrets.
**Phase 1:** Claude Haiku `enrich` + weekly `brief` → Markdown in the Astro
content collection. Needs `ANTHROPIC_API_KEY`.

## Setup

```bash
cd pipeline
python -m venv .venv
# Windows PowerShell:  .venv\Scripts\Activate.ps1
# Windows cmd/git-bash: source .venv/Scripts/activate
# macOS/Linux:          source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python run.py            # crawl + store (Phase 0); safe to re-run (dedups)
python run.py enrich     # Claude Haiku enrichment of un-enriched articles
python run.py aggregate  # rebuild daily trend_snapshots from enrichment
python run.py brief      # write weekly brief into ../src/content/articles/
python run.py publish    # recent-by-topic.json, trends.json, entity pages
python run.py notify     # POST latest brief to LEAD_WEBHOOK_URL (if set)
python run.py all        # crawl → enrich → aggregate → brief → publish → notify
python inspect_db.py     # show counts + recent titles
```

Crawl is idempotent: already-seen URLs and identical content are dropped, so a
second crawl inserts ~0. Enrichment is cached by article id — re-running never
re-spends on already-processed articles.

### Phase 1 setup

```bash
cp .env.example .env
# edit .env -> ANTHROPIC_API_KEY=sk-ant-...
python run.py all
```

Cost guard: `VNNEWS_ENRICH_LIMIT` (default 40) caps articles enriched per run.
Model defaults to `claude-haiku-4-5-20251001` (override with `VNNEWS_MODEL`).

## Layout

```
pipeline/
├── run.py            # entry point
├── inspect_db.py     # peek at the DB
├── sources.yaml      # source registry (RSS feeds, crawl etiquette knobs)
├── requirements.txt
└── vnnews/
    ├── config.py     # load sources.yaml + .env
    ├── models.py     # Article + id/content-hash helpers
    ├── crawl.py      # async crawl: robots.txt, per-domain throttle, UA
    ├── extract.py    # trafilatura main-text + capped excerpt
    ├── dedup.py      # exact dedup (URL + content hash)
    ├── enrich.py     # Claude Haiku structured enrichment (forced tool-use)
    ├── brief.py      # weekly Markdown brief -> Astro content collection
    ├── db.py         # SQLite schema + upserts
    └── pipeline.py   # orchestration + CLI (crawl|enrich|brief|all)
```

## Etiquette (built in)

- Respects `robots.txt` per domain (cached).
- Descriptive, contactable `User-Agent`.
- Per-domain rate limiting (serialized fetch + min gap).
- Stores only a capped excerpt + link — never republishes full article bodies.

## Phase 2 — site surfaces & automation

- **Recent developments** on topic pages: add two lines to any topic page
  (`src/pages/<topic>.astro`) — already wired into `payments.astro`:
  ```astro
  import RecentDevelopments from '../components/RecentDevelopments.astro';
  ...
  <RecentDevelopments topic="payments" />   {/* topic = site slug */}
  ```
  The component reads `src/data/recent-by-topic.json` and renders nothing when a
  topic has no items, so it is safe to add before the first pipeline run.
- **Real trends**: `src/data/trends.json` (topic momentum + sentiment over time)
  generated from `trend_snapshots`, replacing the simulated trend data.
- **Entity pages**: `company-<slug>.md` auto-written for companies past
  `MIN_COMPANY_MENTIONS` mentions.
- **Automation**: `.github/workflows/news-pipeline.yml` runs `python run.py all`
  on a weekly cron and commits results back (Vercel rebuilds on push). The DB is
  committed so trend history accumulates. Set repo secrets `ANTHROPIC_API_KEY`
  and (optionally) `LEAD_WEBHOOK_URL`.

## Next (Phase 3)

Semantic search over the enriched corpus (embeddings), EN/VN split surfaces,
move to daily cadence, and retire the live LLM path in `src/utils/newsFeed.ts`.

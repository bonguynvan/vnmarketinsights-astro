# Next steps — deferred setup (keys, env, deploy)

Everything below is **built and shipped but inert** until you add the keys/env or
deploy. Each feature degrades gracefully today; setting the env "flips it on".
No code changes needed for the items marked _(env only)_.

Last updated: 2026-06-29.

---

## 1. Perplexity research (`/research`) — _(env only)_

Live-web, cited answers. Without a key it already works via the news-corpus fallback;
with a key it upgrades to live web + fresh citations.

- [ ] Get a Perplexity API key → https://www.perplexity.ai (API / Settings).
- [ ] In **Vercel → Project → Settings → Environment Variables**, add:
  - `PERPLEXITY_API_KEY` = `pplx-...`
  - `PERPLEXITY_MODEL` = `sonar-pro` _(optional; default is `sonar-pro`, use `sonar` for cheaper)_
- [ ] Redeploy. Visit `/research` — the source badge flips to 🟢 **Live web**.

Files (no edits needed): `src/utils/perplexityResearch.ts`, `src/pages/api/research.ts`, `src/pages/research.astro`.

---

## 2. VN Trend microservice (`/trends/daily`) — deploy + env

Standalone service (Google Trends + YouTube + daily AI synthesis). Repo:
**github.com/bonguynvan/vn-trend-service** (private). The site page `/trends/daily`
shows "being set up" until `TREND_SERVICE_URL` is set.

### a. Deploy the service (Coolify)
- [ ] Get a **YouTube Data API v3** key → Google Cloud Console (free quota).
- [ ] Pick a long random **`RUN_TOKEN`** (protects the manual-trigger endpoint).
- [ ] Coolify → New Resource → Docker Compose → point at the repo.
- [ ] Set service env vars: `ANTHROPIC_API_KEY`, `YOUTUBE_API_KEY`, `RUN_TOKEN`.
- [ ] **Host in a VN/SG region** — Google Trends (pytrends) is geo/rate-sensitive; US runners were the original "platform API limits" failure.
- [ ] Set a domain, e.g. `trends-api.vnmarketinsights.com`.
- [ ] Smoke-test:
  ```bash
  curl -X POST https://trends-api.vnmarketinsights.com/api/run-now \
       -H "Authorization: Bearer <RUN_TOKEN>"
  curl https://trends-api.vnmarketinsights.com/api/summary
  ```

### b. Connect the site _(env only)_
- [ ] In **Vercel** add `TREND_SERVICE_URL` = `https://trends-api.vnmarketinsights.com`.
- [ ] Redeploy. `/trends/daily` lights up automatically.
- [ ] _(optional)_ Ask me to add `/trends/daily` to the nav/footer once it's live (currently only reachable via the `/trends` breadcrumb).

Files (no edits needed): `src/pages/api/vn-trends.ts`, `src/pages/trends/daily.astro`.

---

## 3. Stock signals — fundamentals source (code work, later)

`/markets` currently shows a **technical-only** outlook (real OHLC from VietCap).
The full 0–100 score (fundamentals + technical) only runs on the illustrative
worked-example page.

- [ ] Decide a fundamentals source (P/E, ROE, D/E, profit growth, dividend yield).
      VietCap's GraphQL returned empty without a session token; options: a session
      token, another provider, or a manual quarterly snapshot.
- [ ] Once available, feed it into `scripts/fetch-stock-snapshot.mjs` so per-ticker
      pages get the real composite score. Ask me to wire it.

Note: the snapshot refresh runs best-effort in the news-pipeline cron; if VietCap
geo-blocks GitHub's US runners, the last committed snapshot keeps serving.

---

## 4. Keyword Miner (`/keywords`) — real API (later)

Currently labeled as **illustrative demo data**. To make it real:

- [ ] Choose a keyword data provider (e.g. an SEO API with a key).
- [ ] Replace `getSimulatedKeywords()` behind `src/pages/api/keywords/[seed].ts`.
- [ ] Drop the "demo data" label in `src/pages/tools/index.astro`. Ask me to wire it.

---

## 5. Telegram news channel (public) — build when ready

Push the news digest from the pipeline to a **public Telegram channel** (you
receive it + it's a distribution/backlink channel). Plumbing is half-built:
`pipeline/vnnews/notify.py` already finds the latest brief and has a weekly guard.

What you do first:
- [ ] Decide cadence — **daily headlines** (more engaging for a public channel) vs
      **weekly brief** (low noise). _Leaning: daily for a public channel._
- [ ] Create the public channel; add your bot as an **admin** (so it can post).
- [ ] Grab the bot token and the channel id (`@channelusername`, or the numeric
      `-100…` id).
- [ ] Add GitHub Actions secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL`.

Then ask me to build it — I'll add a best-effort Telegram push to `notify.py`
(env-gated, per-period guard, headlines + link back to the site), wired into the
existing news-pipeline cron. No-op until the secrets are set.

## 6. X (Twitter) — profile done; auto-posting optional (later)

- [x] Profile linked in the site's Organization schema (`sameAs` →
      https://x.com/vnmarketinsight). _(done)_
- [ ] _(optional)_ Auto-post new briefs/insights to X. X API v2 free tier is
      ~500 writes/month (write-only) — enough for daily. More setup (OAuth +
      poster module); lower ROI than Telegram. Ask me when you want it.

## Quick env reference

| Env var | Where | Enables |
|---------|-------|---------|
| `PERPLEXITY_API_KEY` | Vercel (site) | Live-web `/research` |
| `PERPLEXITY_MODEL` | Vercel (site, optional) | Override Sonar model |
| `TREND_SERVICE_URL` | Vercel (site) | `/trends/daily` + `/api/vn-trends` |
| `ANTHROPIC_API_KEY` | Coolify (service) | Daily AI trend synthesis |
| `YOUTUBE_API_KEY` | Coolify (service) | YouTube trending collector |
| `RUN_TOKEN` | Coolify (service) | Protect `POST /api/run-now` |
| `TELEGRAM_BOT_TOKEN` | GitHub Actions (pipeline) | Telegram digest push _(when built)_ |
| `TELEGRAM_CHANNEL` | GitHub Actions (pipeline) | Target channel for the push |

All are documented in the respective `.env.example` files (site root and the
`vn-trend-service` repo). Nothing here is committed — keys live in the host envs only.

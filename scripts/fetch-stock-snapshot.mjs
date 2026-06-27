/**
 * fetch-stock-snapshot.mjs
 *
 * Fetches real daily OHLCV history for a curated list of large-cap Vietnamese
 * tickers from VietCap's public chart gateway and writes a committed snapshot to
 * src/data/stock-snapshot.json.
 *
 * Design: the Astro BUILD never calls this — it only reads the committed JSON, so
 * the site is always stable and reproducible. This script refreshes the snapshot
 * (run locally or by the news-pipeline cron) and the result is committed to git.
 *
 * Usage:  node scripts/fetch-stock-snapshot.mjs
 *
 * Resilient by design: per-ticker retries with backoff; a ticker that keeps
 * failing is skipped (logged) rather than failing the whole run. If FEWER than
 * MIN_OK tickers succeed, the existing snapshot is left untouched.
 */
import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'src', 'data', 'stock-snapshot.json');

const OHLC_URL = 'https://trading.vietcap.com.vn/api/chart/OHLCChart/gap';
const HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; vnmarketinsights-snapshot/1.0)',
  Origin: 'https://trading.vietcap.com.vn',
  Referer: 'https://trading.vietcap.com.vn/',
};

// Curated large-cap universe (VN30-leaning). Names are hardcoded to avoid a
// second flaky endpoint; sector is a light label for the hub.
const UNIVERSE = [
  { ticker: 'FPT', name: 'FPT Corporation', sector: 'Technology' },
  { ticker: 'VCB', name: 'Vietcombank', sector: 'Banking' },
  { ticker: 'TCB', name: 'Techcombank', sector: 'Banking' },
  { ticker: 'ACB', name: 'Asia Commercial Bank', sector: 'Banking' },
  { ticker: 'MBB', name: 'Military Bank', sector: 'Banking' },
  { ticker: 'VPB', name: 'VPBank', sector: 'Banking' },
  { ticker: 'BID', name: 'BIDV', sector: 'Banking' },
  { ticker: 'CTG', name: 'VietinBank', sector: 'Banking' },
  { ticker: 'VIC', name: 'Vingroup', sector: 'Conglomerate' },
  { ticker: 'VHM', name: 'Vinhomes', sector: 'Real estate' },
  { ticker: 'VRE', name: 'Vincom Retail', sector: 'Real estate' },
  { ticker: 'HPG', name: 'Hoa Phat Group', sector: 'Materials' },
  { ticker: 'VNM', name: 'Vinamilk', sector: 'Consumer staples' },
  { ticker: 'MSN', name: 'Masan Group', sector: 'Consumer staples' },
  { ticker: 'MWG', name: 'Mobile World', sector: 'Retail' },
  { ticker: 'FRT', name: 'FPT Retail', sector: 'Retail' },
  { ticker: 'PNJ', name: 'Phu Nhuan Jewelry', sector: 'Retail' },
  { ticker: 'GAS', name: 'PetroVietnam Gas', sector: 'Energy' },
  { ticker: 'SSI', name: 'SSI Securities', sector: 'Financial services' },
  { ticker: 'VJC', name: 'Vietjet Air', sector: 'Industrials' },
];

const BARS_TO_KEEP = 260; // ≈ 1 trading year — enough for MA200 + 52-week range
const MIN_OK = 10; // refuse to overwrite a good snapshot with a mostly-failed run
const MAX_RETRIES = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fetch one ticker's daily bars as [{t,o,h,l,c,v}], ascending by time. */
async function fetchBars(ticker) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 500 * 86400; // request wide; trim later

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(OHLC_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ timeFrame: 'ONE_DAY', symbols: [ticker], from, to }),
      });
      if (res.status !== 200) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const block = Array.isArray(json) ? json[0] : json;
      if (!block || !Array.isArray(block.t) || block.t.length === 0) {
        throw new Error('empty payload');
      }
      const n = block.t.length;
      const bars = [];
      for (let i = 0; i < n; i++) {
        const c = Number(block.c[i]);
        const t = Number(block.t[i]);
        if (!Number.isFinite(c) || c <= 0 || !Number.isFinite(t)) continue;
        bars.push({
          t,
          o: Number(block.o[i]),
          h: Number(block.h[i]),
          l: Number(block.l[i]),
          c,
          v: Number(block.v[i]) || 0,
        });
      }
      bars.sort((a, b) => a.t - b.t);
      return bars.slice(-BARS_TO_KEEP);
    } catch (err) {
      const wait = 1000 * attempt;
      console.warn(`  [${ticker}] attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}` +
        (attempt < MAX_RETRIES ? ` — retrying in ${wait}ms` : ''));
      if (attempt < MAX_RETRIES) await sleep(wait);
    }
  }
  return null;
}

async function main() {
  console.log(`Fetching daily OHLC for ${UNIVERSE.length} tickers from VietCap…`);
  const out = [];
  for (const entry of UNIVERSE) {
    const bars = await fetchBars(entry.ticker);
    if (bars && bars.length >= 60) {
      out.push({ ...entry, bars });
      const last = bars[bars.length - 1];
      console.log(`  ✓ ${entry.ticker}: ${bars.length} bars, last close ${last.c}`);
    } else {
      console.warn(`  ✗ ${entry.ticker}: skipped (insufficient data)`);
    }
    await sleep(300); // be polite to the gateway
  }

  if (out.length < MIN_OK) {
    console.error(`\nOnly ${out.length}/${UNIVERSE.length} tickers succeeded (min ${MIN_OK}).`);
    console.error('Leaving the existing snapshot untouched.');
    process.exit(1);
  }

  // Use the latest bar date across the set as the snapshot "as of" date —
  // avoids embedding a run timestamp that churns the file with no data change.
  let maxT = 0;
  for (const s of out) maxT = Math.max(maxT, s.bars[s.bars.length - 1].t);
  const asOf = new Date(maxT * 1000).toISOString().slice(0, 10);

  const payload = {
    asOf,
    source: 'VietCap (trading.vietcap.com.vn) — daily OHLC',
    tickerCount: out.length,
    tickers: out,
  };

  // Stable key order + trailing newline so re-runs with identical data produce
  // an identical file (no spurious git churn).
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 0) + '\n', 'utf8');
  console.log(`\nWrote ${out.length} tickers (as of ${asOf}) → ${OUT_PATH}`);

  // Echo file size for sanity.
  const written = await readFile(OUT_PATH, 'utf8');
  console.log(`Snapshot size: ${(written.length / 1024).toFixed(0)} KB`);
}

main().catch((err) => {
  console.error('Snapshot fetch failed:', err);
  process.exit(1);
});

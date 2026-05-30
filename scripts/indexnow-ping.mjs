// IndexNow notifier — pings Bing, Yandex, Seznam, and other IndexNow-compatible
// search engines with the list of URLs that changed since the previous build.
//
// Why: Bing typically takes days to re-crawl a sitemap. IndexNow drops that to
// minutes. Google does NOT yet support IndexNow but Bing is significant for the
// English Vietnam-research audience.
//
// Setup (already done for this repo):
// - A committed key lives in DEFAULT_KEY below and is served at public/<key>.txt,
//   which IndexNow fetches to verify domain ownership. The key is public by design.
// - INDEXNOW_KEY env var overrides DEFAULT_KEY if you ever rotate the key
//   (remember to add the matching public/<new-key>.txt and remove the old one).
// - This script runs in postbuild and reads the sitemap to figure out URLs.
//
// It only pings on production/CI builds (VERCEL/CI/INDEXNOW_FORCE), so local
// `npm run build` is unaffected, and it no-ops when no URL lastmod changed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputDir = process.argv[2] || '../dist';
const DIST_DIR = path.resolve(__dirname, inputDir);
const HOST = 'vnmarketinsights.com';
const SITE_URL = `https://${HOST}`;
const STATE_FILE = path.join(DIST_DIR, '.indexnow-state.json');
const ENDPOINT = 'https://api.indexnow.org/IndexNow';

// IndexNow key. Not a secret — it is served publicly at /<key>.txt (see
// public/<key>.txt). The committed default lets production builds work with no
// extra config; INDEXNOW_KEY env var overrides it if you rotate the key.
const DEFAULT_KEY = '81a0d7ee2a17262bb65d748893a389b2';

// Only ping from production / CI builds (e.g. Vercel) so local `npm run build`
// doesn't spam the IndexNow API. Set INDEXNOW_FORCE=1 to override locally.
const IS_PROD_BUILD =
  process.env.VERCEL === '1' ||
  process.env.CI === 'true' ||
  process.env.INDEXNOW_FORCE === '1';

async function main() {
  const key = process.env.INDEXNOW_KEY || DEFAULT_KEY;
  if (!key) {
    console.log('[indexnow] no key configured — skipping.');
    return;
  }

  if (!IS_PROD_BUILD) {
    console.log('[indexnow] not a production build (VERCEL/CI/INDEXNOW_FORCE unset) — skipping.');
    return;
  }

  const sitemapPath = path.join(DIST_DIR, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.warn('[indexnow] sitemap.xml not found, cannot enumerate URLs.');
    return;
  }

  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  const urlMatches = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>\s*<lastmod>(.*?)<\/lastmod>/g)];

  // Only ping URLs whose lastmod has changed since the previous run.
  const previousState = fs.existsSync(STATE_FILE)
    ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    : {};
  const currentState = {};
  const changedUrls = [];

  for (const match of urlMatches) {
    const loc = match[1];
    const lastmod = match[2];
    currentState[loc] = lastmod;
    if (previousState[loc] !== lastmod) {
      changedUrls.push(loc);
    }
  }

  if (changedUrls.length === 0) {
    console.log('[indexnow] No URL lastmod changes since previous build — nothing to ping.');
    fs.writeFileSync(STATE_FILE, JSON.stringify(currentState, null, 2));
    return;
  }

  // IndexNow accepts up to 10,000 URLs per call. Our site is well under.
  const body = {
    host: HOST,
    key,
    keyLocation: `${SITE_URL}/${key}.txt`,
    urlList: changedUrls,
  };

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });

    if (response.ok || response.status === 202) {
      console.log(`[indexnow] Pinged ${changedUrls.length} changed URLs (HTTP ${response.status}).`);
      fs.writeFileSync(STATE_FILE, JSON.stringify(currentState, null, 2));
    } else {
      const text = await response.text();
      console.warn(`[indexnow] HTTP ${response.status}: ${text.slice(0, 200)}`);
      // Do NOT update state on failure — next build will retry.
    }
  } catch (err) {
    console.warn('[indexnow] Network error:', err.message);
  }
}

main().catch((err) => {
  // Never let an IndexNow failure break the build.
  console.warn('[indexnow] Unexpected error:', err.message);
});

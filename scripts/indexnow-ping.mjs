// IndexNow notifier — pings Bing, Yandex, Seznam, and other IndexNow-compatible
// search engines with the list of URLs that changed since the previous build.
//
// Why: Bing typically takes days to re-crawl a sitemap. IndexNow drops that to
// minutes. Google does NOT yet support IndexNow but Bing is significant for the
// English Vietnam-research audience.
//
// Setup:
// 1. Generate a 32-char hex key (e.g. crypto.randomUUID without dashes).
// 2. Set INDEXNOW_KEY env var in Vercel (Project Settings -> Environment Variables).
// 3. Create public/<key>.txt with the same key as file contents — IndexNow
//    will fetch this to verify domain ownership.
// 4. This script runs in postbuild and reads the sitemap to figure out URLs.
//
// If INDEXNOW_KEY is not set, the script no-ops with a friendly message so
// local builds are unaffected.

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

async function main() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    console.log('[indexnow] INDEXNOW_KEY not set — skipping. See scripts/indexnow-ping.mjs for setup.');
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

// Generates a Google News sitemap (news-sitemap.xml) for recent weekly briefs.
//
// Google News only indexes articles published in the last ~2 days, so this
// sitemap lists Market Brief pages with a publishedDate within 48h (EN + VI,
// tagged by language). Submit news-sitemap.xml separately in Search Console.
//
// Run (postbuild): node scripts/generate-news-sitemap.mjs ../.vercel/output/static

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputDir = process.argv[2] || '../dist';
const DIST_DIR = path.resolve(__dirname, inputDir);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(PROJECT_ROOT, 'src/content/articles');
const SITE_URL = 'https://vnmarketinsights.com';
const PUBLICATION_NAME = 'Vietnam Market Insights';
const MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000; // Google News: ~2 days

function frontmatter(md, key) {
  const m = md.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, 'm'));
  return m ? m[1].trim() : '';
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generate() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`[news-sitemap] output dir not found: ${DIST_DIR}`);
    process.exit(0); // non-fatal
  }
  if (!fs.existsSync(ARTICLES_DIR)) {
    console.log('[news-sitemap] no articles dir — skipping.');
    return;
  }

  const now = Date.now();
  const entries = [];

  for (const file of fs.readdirSync(ARTICLES_DIR)) {
    if (!/^brief-.*\.md$/.test(file)) continue;
    const md = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf-8');
    if (frontmatter(md, 'category') !== 'Market Brief') continue;

    const published = frontmatter(md, 'publishedDate');
    const ts = published ? new Date(published).valueOf() : NaN;
    if (Number.isNaN(ts) || now - ts > MAX_AGE_MS) continue;

    const slug = file.replace(/\.md$/, '');
    entries.push({
      loc: `${SITE_URL}/insights/${slug}/`,
      title: frontmatter(md, 'title'),
      date: new Date(ts).toISOString(),
      language: slug.endsWith('-vi') ? 'vi' : 'en',
    });
  }

  entries.sort((a, b) => a.loc.localeCompare(b.loc));

  const body = entries
    .map(
      (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(PUBLICATION_NAME)}</news:name>
        <news:language>${e.language}</news:language>
      </news:publication>
      <news:publication_date>${e.date}</news:publication_date>
      <news:title>${escapeXml(e.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${body}
</urlset>
`;

  fs.writeFileSync(path.join(DIST_DIR, 'news-sitemap.xml'), xml);
  console.log(`[news-sitemap] wrote news-sitemap.xml with ${entries.length} brief(s).`);
}

generate();

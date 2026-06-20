// Generates a 1200x630 PNG OG image per generated content page (weekly briefs
// and company entity pages), so each gets a distinct social card showing its
// title. Runs at build time (npm `prebuild`).
//
// Reads src/content/articles/{brief,company}-*.md, renders an SVG per file,
// rasterizes via sharp to public/og/<slug>.png. insights/[slug].astro
// references /og/<slug>.png for Market Brief and Company pages.
//
// Run: node scripts/make-brief-og.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = path.resolve(__dirname, '../src/content/articles');
const OUT_DIR = path.resolve(__dirname, '../public/og');

function readTitle(md) {
  const m = md.match(/^title:\s*"([^"]+)"/m);
  return m ? m[1] : 'Vietnam Market Brief';
}

function readCategory(md) {
  const m = md.match(/^category:\s*"([^"]+)"/m);
  return m ? m[1] : '';
}

function eyebrowFor(category) {
  if (category === 'Company') return 'VIETNAM MARKET INSIGHTS · COMPANY';
  return 'VIETNAM MARKET INSIGHTS · WEEKLY BRIEF';
}

// Wrap a title into <= maxChars lines (word-aware), capped at maxLines.
function wrapTitle(title, maxChars = 26, maxLines = 3) {
  const words = title.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{1}$/, '…');
  }
  return lines;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function svgFor(title, eyebrow) {
  const lines = wrapTitle(title);
  const startY = 300 - (lines.length - 1) * 48;
  const tspans = lines
    .map(
      (ln, i) =>
        `<text x="92" y="${startY + i * 96}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="76" font-weight="800" fill="#ffffff">${escapeXml(ln)}</text>`,
    )
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="55%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#111c33"/>
    </linearGradient>
    <radialGradient id="glow" cx="88%" cy="-5%" r="70%">
      <stop offset="0%" stop-color="#c8102e" stop-opacity="0.40"/>
      <stop offset="60%" stop-color="#c8102e" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="14" height="630" fill="#c8102e"/>
  <circle cx="104" cy="120" r="7" fill="#c8102e"/>
  <text x="124" y="128" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="24" font-weight="600" letter-spacing="3" fill="#f0a9b4">${escapeXml(eyebrow)}</text>
  ${tspans}
  <line x1="92" y1="556" x2="1108" y2="556" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  <text x="92" y="596" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="29" font-weight="700" fill="#ffffff">vnmarketinsights.com</text>
  <text x="1108" y="596" text-anchor="end" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="23" font-weight="500" fill="#93a4bd">AI-summarized · neutral · sourced</text>
</svg>`;
}

async function main() {
  if (!fs.existsSync(ARTICLES_DIR)) {
    console.log('[brief-og] no articles dir — skipping.');
    return;
  }
  const files = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => /^(brief|company)-.*\.md$/.test(f));
  if (files.length === 0) {
    console.log('[brief-og] no briefs or entity pages found — skipping.');
    return;
  }

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.warn('[brief-og] sharp not available — skipping OG generation.');
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let count = 0;
  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const md = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf-8');
    const svg = svgFor(readTitle(md), eyebrowFor(readCategory(md)));
    await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, `${slug}.png`));
    count++;
  }
  console.log(`[brief-og] wrote ${count} OG image(s) to public/og/`);
}

main().catch((err) => {
  console.error('[brief-og] failed:', err.message);
  // Non-fatal: build should still succeed with the default OG image.
  process.exit(0);
});

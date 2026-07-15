#!/usr/bin/env node
/**
 * Content freshness audit for reference pages.
 *
 * Scans hand-authored reference/stat pages for dated claims, flags anything
 * that is older than the current year, and — when PERPLEXITY_API_KEY is set —
 * attaches a per-page research brief (latest figures + citations) drawn from
 * Perplexity Sonar. It NEVER edits pages: it writes a Markdown report you
 * review, then apply the verified numbers by hand (accuracy is the whole point
 * of these pages, so a human confirms every figure before it ships).
 *
 * Usage:
 *   node scripts/freshness-audit.mjs                 # audit the default page set
 *   node scripts/freshness-audit.mjs src/pages/payments.astro ...  # specific files
 *   node scripts/freshness-audit.mjs --out report.md # custom output path
 *
 * Env:
 *   PERPLEXITY_API_KEY   optional — enables the live research brief per page
 *   PERPLEXITY_MODEL     optional — default "sonar-pro"
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const STALE_AT_OR_BEFORE = CURRENT_YEAR - 2; // e.g. 2026 → 2024 and older = stale
const AGING_YEAR = CURRENT_YEAR - 1;         // e.g. 2025 = aging (refresh soon)

// Default flagship reference pages (most value, most numeric claims).
const DEFAULT_PAGES = [
  'src/pages/payments.astro',
  'src/pages/fintech.astro',
  'src/pages/ecommerce.astro',
  'src/pages/retail.astro',
  'src/pages/logistics.astro',
  'src/pages/consumers.astro',
  'src/pages/platforms.astro',
  'src/pages/financial-markets.astro',
  'src/pages/regulations.astro',
];

// Topic hints for the Sonar research brief, keyed by page basename.
const TOPIC_HINTS = {
  'payments.astro': 'Vietnam digital payments, e-wallets, QR/VietQR, cashless transaction statistics',
  'fintech.astro': 'Vietnam fintech market size, number of fintech firms, segments (payments, lending, insurtech, wealthtech), funding',
  'ecommerce.astro': 'Vietnam e-commerce market size, GMV, top platforms (Shopee, TikTok Shop, Lazada)',
  'retail.astro': 'Vietnam retail market: total retail sales, modern vs traditional trade, grocery and convenience chains (WinCommerce, Bach Hoa Xanh)',
  'logistics.astro': 'Vietnam logistics and last-mile delivery market, express parcel volume',
  'consumers.astro': 'Vietnam consumer market, retail sales, internet and smartphone penetration',
  'platforms.astro': 'Vietnam digital platforms, super-apps, social commerce usage',
  'financial-markets.astro': 'Vietnam stock market (VN-Index), market capitalisation, listed companies, foreign ownership',
  'regulations.astro': 'Vietnam business, tax and foreign-investment regulation updates',
};

function parseArgs(argv) {
  const files = [];
  let out = 'freshness-audit.md';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') { out = argv[++i]; continue; }
    files.push(argv[i]);
  }
  return { files: files.length ? files : DEFAULT_PAGES, out };
}

const YEAR_RE = /\b(20\d{2})\b/g;
// Lines that carry a year but are metadata/plumbing, not a content claim.
const SKIP_LINE_RE = /(temporalCoverage|datePublished|dateModified|canonical|https?:\/\/|import\s|@context)/;
// A history/timeline section is SUPPOSED to be dated — flagging it is noise.
// Once we cross into one, stop counting its years as stale.
const HISTORY_ZONE_RE = /id=["'](history|timeline)["']|Historical Context|>\s*History\b/i;

function auditFile(path) {
  const abs = resolve(path);
  let text;
  try {
    text = readFileSync(abs, 'utf8');
  } catch {
    return { path, error: 'not readable' };
  }

  const lastUpdatedMatch = text.match(/lastUpdated\s*=\s*["'](\d{4}-\d{2}-\d{2})["']/);
  const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1] : null;

  const lines = text.split('\n');
  const stale = [];
  const aging = [];
  let inHistoryZone = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inHistoryZone && HISTORY_ZONE_RE.test(line)) inHistoryZone = true;
    if (inHistoryZone) continue; // historical/timeline content is meant to be dated
    if (SKIP_LINE_RE.test(line)) continue;
    const years = [...line.matchAll(YEAR_RE)].map((m) => Number(m[1]));
    if (!years.length) continue;
    const maxYear = Math.max(...years);
    if (maxYear > CURRENT_YEAR) continue; // future targets (e.g. "by 2030") — fine
    const snippet = line.trim().replace(/\s+/g, ' ').slice(0, 160);
    const entry = { line: i + 1, year: maxYear, snippet };
    if (maxYear <= STALE_AT_OR_BEFORE) stale.push(entry);
    else if (maxYear === AGING_YEAR) aging.push(entry);
  }

  const lastUpdatedAgeDays = lastUpdated
    ? Math.round((NOW - new Date(lastUpdated)) / 86_400_000)
    : null;

  return { path, lastUpdated, lastUpdatedAgeDays, stale, aging };
}

async function researchBrief(topic) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return null;
  const model = process.env.PERPLEXITY_MODEL || 'sonar-pro';
  const prompt =
    `Give the most recent (full-year ${AGING_YEAR} or ${CURRENT_YEAR}) official statistics for ${topic}. ` +
    `List 5-8 concrete figures as bullet points, each with the year and a source. ` +
    `Prefer primary sources (government agencies, central bank, official reports). Be concise.`;
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return { error: `Sonar HTTP ${res.status}` };
    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content || '';
    const citations = data?.citations || data?.search_results?.map((s) => s.url) || [];
    return { answer, citations };
  } catch (err) {
    return { error: String(err) };
  }
}

function fmtReport(results, sonarEnabled) {
  const lines = [];
  lines.push(`# Content freshness audit`);
  lines.push('');
  lines.push(`Generated: ${NOW.toISOString().slice(0, 10)} · current year: ${CURRENT_YEAR}`);
  lines.push(`Stale = claim dated ≤ ${STALE_AT_OR_BEFORE}; aging = ${AGING_YEAR}.`);
  lines.push(sonarEnabled
    ? `Research briefs: **enabled** (Perplexity Sonar).`
    : `Research briefs: disabled (set PERPLEXITY_API_KEY to attach current figures + citations).`);
  lines.push('');

  // Ranked worst-first by stale count.
  const ranked = results
    .filter((r) => !r.error)
    .sort((a, b) => b.stale.length - a.stale.length);

  lines.push(`## Summary`);
  lines.push('');
  lines.push(`| Page | Last updated | Age (days) | Stale | Aging |`);
  lines.push(`|---|---|---|---|---|`);
  for (const r of ranked) {
    lines.push(`| ${r.path} | ${r.lastUpdated ?? '—'} | ${r.lastUpdatedAgeDays ?? '—'} | ${r.stale.length} | ${r.aging.length} |`);
  }
  lines.push('');

  for (const r of ranked) {
    if (!r.stale.length && !r.aging.length) continue;
    lines.push(`## ${r.path}`);
    lines.push(`Last updated: ${r.lastUpdated ?? '—'}${r.lastUpdatedAgeDays != null ? ` (${r.lastUpdatedAgeDays} days ago)` : ''}`);
    lines.push('');
    if (r.stale.length) {
      lines.push(`### Stale claims (≤ ${STALE_AT_OR_BEFORE})`);
      for (const e of r.stale) lines.push(`- L${e.line} · ${e.year} · ${e.snippet}`);
      lines.push('');
    }
    if (r.aging.length) {
      lines.push(`### Aging claims (${AGING_YEAR})`);
      for (const e of r.aging) lines.push(`- L${e.line} · ${e.year} · ${e.snippet}`);
      lines.push('');
    }
    if (r.brief) {
      lines.push(`### Suggested current figures (Sonar — review before applying)`);
      if (r.brief.error) {
        lines.push(`_Research failed: ${r.brief.error}_`);
      } else {
        lines.push(r.brief.answer || '_(no answer)_');
        if (r.brief.citations?.length) {
          lines.push('');
          lines.push(`Citations:`);
          for (const c of r.brief.citations) lines.push(`- ${c}`);
        }
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

async function main() {
  const { files, out } = parseArgs(process.argv.slice(2));
  const sonarEnabled = Boolean(process.env.PERPLEXITY_API_KEY);

  const results = [];
  for (const path of files) {
    const r = auditFile(path);
    if (!r.error && sonarEnabled && (r.stale.length || r.aging.length)) {
      const hint = TOPIC_HINTS[basename(path)] || basename(path).replace('.astro', '');
      r.brief = await researchBrief(hint);
    }
    results.push(r);
    const tag = r.error ? `ERROR (${r.error})` : `${r.stale.length} stale, ${r.aging.length} aging`;
    console.log(`  ${path} — ${tag}`);
  }

  const report = fmtReport(results, sonarEnabled);
  writeFileSync(resolve(out), report, 'utf8');
  console.log(`\nReport written to ${out}`);
  if (!sonarEnabled) {
    console.log('Tip: set PERPLEXITY_API_KEY to attach current figures + citations per page.');
  }
}

main();

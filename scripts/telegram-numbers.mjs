#!/usr/bin/env node
// Weekly "Vietnam markets — by the numbers" Telegram post.
//
// Uses Perplexity Sonar (live web + citations) to compile 5 current Vietnam
// market figures, then posts a compact, sourced digest to the Telegram channel
// via the bot. Env-gated end to end: without PERPLEXITY_API_KEY it skips the
// research; without TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL it skips the post. Every
// figure carries an inline source, and citation links are appended — this is a
// distribution digest, not an authoritative claim page.
//
//   node scripts/telegram-numbers.mjs            # research + post
//   node scripts/telegram-numbers.mjs --dry-run  # research + print, do not post

import { researchWithSonar, loadDotEnv } from './pplx-research.mjs';

const TELEGRAM_API = 'https://api.telegram.org';
const SITE = 'https://vnmarketinsights.com';
const MAX_TELEGRAM = 4096;

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isoDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildPrompt() {
  return (
    'Compile a concise "Vietnam markets — by the numbers" weekly digest. ' +
    'List exactly 5 of the most important and recent Vietnam market or economy figures, ' +
    'using full-year 2025 or 2026 official data. Choose from: GDP growth, e-commerce market size, ' +
    'digital/cashless payments growth, VN-Index / stock market, FDI, retail sales, exports, ' +
    'international tourism. Format each as one short line exactly like ' +
    '"Metric: value (source, year)". English only. Only include figures attributable to a named ' +
    'official or reputable source. No preamble and no closing sentence — output only the 5 lines.'
  );
}

/** Strip markdown/citation noise Sonar sometimes adds, normalize to bullet lines. */
function cleanAnswer(answer) {
  return answer
    .replace(/\*\*/g, '')
    .replace(/\[\d+\]/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (l.startsWith('•') || l.startsWith('-') ? l.replace(/^[-•]\s*/, '') : l))
    .map((l) => `• ${l}`)
    .join('\n');
}

function formatMessage(answer, citations) {
  const body = escapeHtml(cleanAnswer(answer));
  const parts = [
    '📊 <b>Vietnam markets — by the numbers</b>',
    `<i>Week of ${isoDate()}</i>`,
    '',
    body,
  ];
  const links = (citations || [])
    .slice(0, 3)
    .map((c) => `<a href="${escapeHtml(c.url)}">${escapeHtml(c.title)}</a>`);
  if (links.length) parts.push('', `Sources: ${links.join(' · ')}`);
  parts.push('', `More Vietnam market data → ${SITE}`);

  let msg = parts.join('\n');
  if (msg.length > MAX_TELEGRAM - 40) msg = msg.slice(0, MAX_TELEGRAM - 40) + '…';
  return msg;
}

async function postToTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channel = process.env.TELEGRAM_CHANNEL;
  if (!token || !channel) {
    console.log('Telegram not configured (TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL) — skipping post.');
    return false;
  }
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: channel,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) throw new Error(`Telegram HTTP ${res.status}: ${await res.text().catch(() => '')}`);
  return true;
}

async function main() {
  loadDotEnv();
  const dryRun = process.argv.includes('--dry-run');

  if (!process.env.PERPLEXITY_API_KEY) {
    console.log('No PERPLEXITY_API_KEY — skipping weekly numbers post.');
    return;
  }

  const { answer, citations } = await researchWithSonar(buildPrompt());
  const message = formatMessage(answer, citations);

  if (dryRun) {
    console.log('--- DRY RUN (not posting) ---\n');
    console.log(message);
    return;
  }

  const posted = await postToTelegram(message);
  console.log(posted ? 'Posted weekly numbers to Telegram.' : 'Not posted (Telegram unconfigured).');
}

main().catch((err) => {
  console.error(`Weekly numbers failed: ${err.message}`);
  process.exit(1);
});

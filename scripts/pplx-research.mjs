#!/usr/bin/env node
// Perplexity Sonar research CLI — live-web, cited research for Vietnam market data.
//
//   node scripts/pplx-research.mjs "your question"
//   node scripts/pplx-research.mjs --json "your question"
//
// Reads PERPLEXITY_API_KEY (+ optional PERPLEXITY_MODEL) from the environment or
// a local .env file. The key is never printed. Prints the answer plus a numbered
// list of source citations. Used for content freshness research and as the engine
// behind the freshness-audit / scheduled data-refresh jobs.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ENDPOINT = 'https://api.perplexity.ai/chat/completions';
const TIMEOUT_MS = 30_000;

const SYSTEM_EN =
  "You are a research assistant for Vietnam's market, economy, and business landscape. " +
  'Answer concisely and factually with the most recent information, focused on Vietnam. ' +
  'Prefer primary sources (government agencies, central bank, official statistics) and give ' +
  'concrete numbers with the year and the source name inline. Use neutral, analytical language. ' +
  'Cite sources. This is not investment advice.';

/** Load KEY=VALUE pairs from .env into process.env without overwriting existing vars. */
export function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function hostnameTitle(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function parseCitations(data) {
  const out = [];
  const seen = new Set();
  const push = (url, title) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({ url, title: (title || '').trim() || hostnameTitle(url) });
  };
  if (Array.isArray(data?.search_results)) {
    for (const r of data.search_results) push(r?.url, r?.title);
  }
  if (Array.isArray(data?.citations)) {
    for (const c of data.citations) push(typeof c === 'string' ? c : c?.url, c?.title);
  }
  return out;
}

export async function researchWithSonar(query) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error('PERPLEXITY_API_KEY is not configured (env or .env)');
  const model = process.env.PERPLEXITY_MODEL || 'sonar-pro';

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_EN },
        { role: 'user', content: query.trim().slice(0, 600) },
      ],
      max_tokens: 1200,
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`Perplexity HTTP ${res.status}: ${await res.text().catch(() => '')}`);
  const data = await res.json();
  const answer = data?.choices?.[0]?.message?.content?.trim() || '';
  if (!answer) throw new Error('Empty Sonar response');
  return { answer, citations: parseCitations(data), model };
}

async function main() {
  loadDotEnv();
  const args = process.argv.slice(2);
  const asJson = args[0] === '--json';
  const query = (asJson ? args.slice(1) : args).join(' ').trim();
  if (!query) {
    console.error('Usage: node scripts/pplx-research.mjs [--json] "your question"');
    process.exit(1);
  }

  const result = await researchWithSonar(query);
  if (asJson) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  }
  process.stdout.write(`\n${result.answer}\n\n`);
  if (result.citations.length) {
    process.stdout.write('Sources:\n');
    result.citations.forEach((c, i) => process.stdout.write(`  [${i + 1}] ${c.title} — ${c.url}\n`));
  }
  process.stdout.write(`\n(model: ${result.model})\n`);
}

// Run only when invoked directly (not when imported as a module).
const invokedDirectly = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(`Research failed: ${err.message}`);
    process.exit(1);
  });
}

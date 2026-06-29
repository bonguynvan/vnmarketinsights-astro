// On-demand research via Perplexity Sonar (search + synthesis + live citations).
//
// Server-side only — the API key never reaches the browser. Env-gated: if
// PERPLEXITY_API_KEY is unset, `researchWithSonar` throws PerplexityNotConfigured
// so callers can fall back to the existing corpus search. Sonar is an ADDITION
// for the live-web research flow, not a replacement for the structured pipeline.

export class PerplexityNotConfigured extends Error {
  constructor() {
    super('PERPLEXITY_API_KEY is not configured');
    this.name = 'PerplexityNotConfigured';
  }
}

export interface ResearchCitation {
  title: string;
  url: string;
}

export interface SonarResult {
  answer: string;
  citations: ResearchCitation[];
  model: string;
}

const ENDPOINT = 'https://api.perplexity.ai/chat/completions';
const TIMEOUT_MS = 20_000;

function apiKey(): string {
  return import.meta.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY || '';
}

export function isSonarConfigured(): boolean {
  return Boolean(apiKey());
}

function model(): string {
  return import.meta.env.PERPLEXITY_MODEL || process.env.PERPLEXITY_MODEL || 'sonar-pro';
}

function hostnameTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Normalize Perplexity's citation shapes (search_results | citations) to {title,url}. */
function parseCitations(data: any): ResearchCitation[] {
  const out: ResearchCitation[] = [];
  const seen = new Set<string>();

  const push = (url: string, title?: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({ url, title: title?.trim() || hostnameTitle(url) });
  };

  // Current API: search_results [{ title, url, date }]
  if (Array.isArray(data?.search_results)) {
    for (const r of data.search_results) push(r?.url, r?.title);
  }
  // Legacy: citations [url, ...]
  if (Array.isArray(data?.citations)) {
    for (const c of data.citations) push(typeof c === 'string' ? c : c?.url, c?.title);
  }
  return out;
}

const SYSTEM_EN =
  "You are a research assistant for Vietnam's market, economy, and business landscape. " +
  'Answer concisely and factually with the most recent information, focused on Vietnam. ' +
  'Use neutral, analytical language. Cite sources. This is not investment advice.';
const SYSTEM_VI =
  'Bạn là trợ lý nghiên cứu về thị trường, kinh tế và môi trường kinh doanh Việt Nam. ' +
  'Trả lời súc tích, chính xác, ưu tiên thông tin mới nhất, tập trung vào Việt Nam. ' +
  'Văn phong trung lập, phân tích. Trích dẫn nguồn. Đây không phải lời khuyên đầu tư.';

/**
 * Run a live-web research query via Sonar. Throws PerplexityNotConfigured if no
 * key, or a generic Error on request failure (callers should fall back).
 */
export async function researchWithSonar(query: string, lang: 'en' | 'vi' = 'en'): Promise<SonarResult> {
  const key = apiKey();
  if (!key) throw new PerplexityNotConfigured();

  const trimmed = query.trim().slice(0, 400);
  if (!trimmed) throw new Error('Empty query');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model(),
      messages: [
        { role: 'system', content: lang === 'vi' ? SYSTEM_VI : SYSTEM_EN },
        { role: 'user', content: trimmed },
      ],
      max_tokens: 1000,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    throw new Error(`Perplexity HTTP ${res.status}`);
  }
  const data = await res.json();
  const answer: string = data?.choices?.[0]?.message?.content?.trim() || '';
  if (!answer) throw new Error('Empty Sonar response');

  return { answer, citations: parseCitations(data), model: model() };
}

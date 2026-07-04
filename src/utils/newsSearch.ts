// Semantic search over the precomputed, AI-enriched news corpus.
//
// Replaces the old request-time RSS fetch + Gemini *generation* path. The only
// live call here is a single, cheap query *embedding* (gemini-embedding-001);
// everything else (summaries, sentiment, topics) is precomputed by the pipeline
// and shipped in src/data/news-index.json. Falls back to keyword matching when
// no embedding is available, so search always returns something.

import newsIndex from '../data/news-index.json';

interface IndexItem {
  title: string;
  url: string;
  source: string;
  pubDate: string;
  summary_en: string;
  summary_vn: string;
  topic: string;
  siteSlug: string;
  sentiment: number;
  vec: number[];
}

interface ResultArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  highlights: string[];
}

export interface SearchAnalysis {
  query: string;
  articlesCount: number;
  sentimentScore: number;
  sentimentSummary: string;
  aiSynthesis: string;
  keyStats: string[];
  articles: ResultArticle[];
  mode: 'semantic' | 'keyword' | 'empty';
}

const INDEX = newsIndex as unknown as {
  dims: number;
  model: string;
  items: IndexItem[];
};
const TOP_K = 12;
const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`;

function sentimentLabel(score: number): ResultArticle['sentiment'] {
  if (score > 0.2) return 'positive';
  if (score < -0.2) return 'negative';
  return 'neutral';
}

function toArticle(item: IndexItem, lang: 'en' | 'vi'): ResultArticle {
  const topicChip = item.topic ? item.topic.charAt(0).toUpperCase() + item.topic.slice(1) : '';
  return {
    title: item.title,
    link: item.url,
    description: (lang === 'vi' ? item.summary_vn : item.summary_en) || item.summary_en,
    pubDate: item.pubDate,
    source: item.source,
    sentiment: sentimentLabel(item.sentiment),
    highlights: topicChip ? [topicChip] : [],
  };
}

async function embedQuery(query: string, apiKey: string): Promise<number[] | null> {
  const resp = await fetch(`${EMBED_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text: query.slice(0, 2000) }] },
      outputDimensionality: INDEX.dims,
    }),
  });
  if (!resp.ok) return null;
  const json = await resp.json();
  const values: number[] | undefined = json?.embedding?.values;
  if (!values) return null;
  const norm = Math.sqrt(values.reduce((s, x) => s + x * x, 0)) || 1;
  return values.map((x) => x / norm);
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

function keywordRank(query: string): IndexItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return INDEX.items.slice(0, TOP_K);
  return INDEX.items
    .filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        (it.summary_en || '').toLowerCase().includes(q) ||
        (it.summary_vn || '').toLowerCase().includes(q),
    )
    .slice(0, TOP_K);
}

function synthesize(query: string, ranked: IndexItem[]): string {
  if (ranked.length === 0) {
    return `No enriched coverage matched "${query}" yet. Try broader terms like "FDI", "banking", "exports", or "retail".`;
  }
  const pos = ranked.filter((r) => r.sentiment > 0.2).slice(0, 4);
  const neg = ranked.filter((r) => r.sentiment < -0.2).slice(0, 4);
  const lines: string[] = [];
  lines.push('### Summary');
  lines.push(
    `Based on ${ranked.length} AI-summarized items most relevant to "${query || 'Vietnam market'}", here is the current picture. Summaries are precomputed from public sources; each result links to the original.`,
  );
  if (pos.length) {
    lines.push('### Positive signals');
    pos.forEach((r) => lines.push(`* ${r.summary_en}`));
  }
  if (neg.length) {
    lines.push('### Risks and challenges');
    neg.forEach((r) => lines.push(`* ${r.summary_en}`));
  }
  if (!pos.length && !neg.length) {
    lines.push('### Notable items');
    ranked.slice(0, 4).forEach((r) => lines.push(`* ${r.summary_en}`));
  }
  return lines.join('\n');
}

export async function runSmartSearch(
  query: string = '',
  lang: 'en' | 'vi' = 'en',
): Promise<SearchAnalysis> {
  if (INDEX.items.length === 0) {
    return {
      query: query || 'Overview',
      articlesCount: 0,
      sentimentScore: 0,
      sentimentSummary: 'Neutral',
      aiSynthesis:
        'The semantic news index is empty. Run the pipeline (`python run.py all`) to populate it.',
      keyStats: [],
      articles: [],
      mode: 'empty',
    };
  }

  const apiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  let ranked: IndexItem[] = [];
  let mode: SearchAnalysis['mode'] = 'keyword';

  if (apiKey && query.trim()) {
    try {
      const qvec = await embedQuery(query, apiKey);
      if (qvec) {
        ranked = [...INDEX.items]
          .map((it) => ({ it, score: dot(qvec, it.vec) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, TOP_K)
          .map((x) => x.it);
        mode = 'semantic';
      }
    } catch {
      // fall through to keyword
    }
  }
  if (ranked.length === 0) ranked = keywordRank(query);

  const avg =
    ranked.length > 0 ? ranked.reduce((s, r) => s + r.sentiment, 0) / ranked.length : 0;
  const sentimentScore = Math.round(avg * 100);
  const sentimentSummary =
    sentimentScore > 20 ? 'Positive' : sentimentScore < -20 ? 'Cautious / Negative' : 'Neutral / Stable';

  const topics = [...new Set(ranked.map((r) => r.topic).filter(Boolean))].slice(0, 5);

  return {
    query: query || 'Overview',
    articlesCount: ranked.length,
    sentimentScore,
    sentimentSummary,
    aiSynthesis: synthesize(query, ranked),
    keyStats: topics.map((t) => t.charAt(0).toUpperCase() + t.slice(1)),
    articles: ranked.map((it) => toArticle(it, lang)),
    mode,
  };
}

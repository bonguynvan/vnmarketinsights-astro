export const prerender = false;

/**
 * Server-side proxy to the standalone VN Trend microservice
 * (github.com/bonguynvan/vn-trend-service — Google Trends + YouTube + AI summary).
 *
 * Why a server-side proxy:
 *  - keeps the service URL/keys and CORS server-side (never browser → service);
 *  - caches the last good response in memory so a service outage or cold start
 *    never breaks the page (same resilience posture as the committed snapshots);
 *  - env-gated: if TREND_SERVICE_URL is unset, returns a clean "not configured"
 *    payload so the page degrades gracefully instead of erroring.
 */

interface Keyword {
  rank?: number;
  keyword: string;
}
interface YouTubeItem {
  rank?: number;
  title: string;
  channel?: string;
  views?: number;
  url?: string;
}
interface TrendPayload {
  available: boolean;
  reason?: 'not_configured' | 'unreachable' | 'empty';
  stale?: boolean;
  date?: string | null;
  summary?: string | null;
  keywords?: Keyword[];
  youtube?: YouTubeItem[];
  fetchedAt?: string;
  errors?: string[];
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
const FETCH_TIMEOUT_MS = 4000;

// Module-scoped last-good cache (per server instance).
let cache: { payload: TrendPayload; at: number } | null = null;

const serviceBase = (): string => {
  let raw = (import.meta.env.TREND_SERVICE_URL || process.env.TREND_SERVICE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  // A scheme-less URL (e.g. "api.example.com") makes server-side fetch() throw
  // immediately — normalize to https so a misconfigured env var still works.
  if (raw && !/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  return raw;
};

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadFromService(base: string): Promise<TrendPayload> {
  // /api/trends gives all sources; /api/summary gives the AI synthesis.
  const [trends, summary] = await Promise.allSettled([
    fetchJson(`${base}/api/trends`),
    fetchJson(`${base}/api/summary`),
  ]);

  const errors: string[] = [];
  if (trends.status === 'rejected') errors.push(`trends: ${String(trends.reason?.message || trends.reason)}`);
  if (summary.status === 'rejected') errors.push(`summary: ${String(summary.reason?.message || summary.reason)}`);

  // Both upstream calls failed — that's unreachable, not an empty dataset.
  // Labelling it "empty" hid genuine connectivity/URL problems.
  if (trends.status === 'rejected' && summary.status === 'rejected') {
    return { available: false, reason: 'unreachable', date: null, errors };
  }

  const data = trends.status === 'fulfilled' ? trends.value?.data ?? {} : {};
  const keywords: Keyword[] = Array.isArray(data.google_trends) ? data.google_trends : [];
  const youtube: YouTubeItem[] = Array.isArray(data.youtube) ? data.youtube : [];
  const date =
    (trends.status === 'fulfilled' && trends.value?.date) ||
    (summary.status === 'fulfilled' && summary.value?.date) ||
    null;
  const summaryText = summary.status === 'fulfilled' ? summary.value?.summary ?? null : null;

  if (!keywords.length && !youtube.length && !summaryText) {
    return { available: false, reason: 'empty', date, errors };
  }
  return {
    available: true,
    date,
    summary: summaryText,
    keywords,
    youtube,
    fetchedAt: new Date().toISOString(),
    ...(errors.length ? { errors } : {}),
  };
}

const json = (payload: TrendPayload, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Cache only good responses; never cache failures (or a transient outage
      // would stick at the CDN for the full window and keep the page empty).
      'Cache-Control': payload.available ? 'public, max-age=300' : 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });

export async function GET() {
  const base = serviceBase();
  if (!base) return json({ available: false, reason: 'not_configured' });

  // Serve fresh cache.
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return json(cache.payload);

  try {
    const payload = await loadFromService(base);
    if (payload.available) cache = { payload, at: Date.now() };
    return json(payload);
  } catch {
    // Service unreachable — serve last good cache (flagged stale) if we have it.
    if (cache) return json({ ...cache.payload, stale: true });
    return json({ available: false, reason: 'unreachable' });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export default { GET, OPTIONS };

export const prerender = false;

/**
 * Same-origin proxy for reader reactions (👍/👎), backed by the VN Trend
 * microservice's SQLite store (it already runs on Coolify with the DB attached).
 *
 * Why proxy instead of calling the service from the browser:
 *  - keeps TREND_SERVICE_URL server-side (no CORS, no exposed backend URL);
 *  - hashes the caller's anon id into an opaque `voter` token here, so the raw
 *    id never reaches the store and votes can't be trivially forged per-page;
 *  - degrades gracefully: if the service is unset/unreachable the widget shows
 *    zeroed counts instead of erroring.
 *
 * Identity is the localStorage anon id (forgeable by clearing storage) — good
 * enough for a soft signal, not an election. The (target, voter) key upstream
 * makes each voter's vote idempotent.
 */
import { createHash } from 'node:crypto';

const FETCH_TIMEOUT_MS = 4000;
const VALID_TARGET = /^[a-z0-9][a-z0-9-]{0,80}$/;
const SALT =
  import.meta.env.REACTIONS_SALT || process.env.REACTIONS_SALT || 'vnmarket-reactions';

const serviceBase = (): string => {
  let raw = (import.meta.env.TREND_SERVICE_URL || process.env.TREND_SERVICE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (raw && !/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  return raw;
};

const voterToken = (anonId: string): string =>
  createHash('sha256').update(`${SALT}:${anonId}`).digest('hex').slice(0, 32);

const json = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });

const zeroed = (reason: string, status = 200): Response =>
  json({ available: false, reason, up: 0, down: 0, mine: 0 }, status);

export async function GET({ url }: { url: URL }): Promise<Response> {
  const target = (url.searchParams.get('target') || '').trim();
  const anonId = (url.searchParams.get('v') || '').trim();
  if (!VALID_TARGET.test(target)) return zeroed('invalid_target', 400);

  const base = serviceBase();
  if (!base) return zeroed('not_configured');

  try {
    const qs = new URLSearchParams({ target });
    if (anonId) qs.set('voter', voterToken(anonId));
    const res = await fetch(`${base}/api/reactions?${qs}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return json({ available: true, ...(await res.json()) });
  } catch {
    return zeroed('unreachable');
  }
}

export async function POST({ request }: { request: Request }): Promise<Response> {
  const base = serviceBase();
  if (!base) return zeroed('not_configured', 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return zeroed('bad_request', 400);
  }

  const b = body as { target?: unknown; anonId?: unknown; value?: unknown };
  const target = String(b?.target ?? '').trim();
  const anonId = String(b?.anonId ?? '').trim();
  const value = Number(b?.value);

  if (!VALID_TARGET.test(target)) return zeroed('invalid_target', 400);
  if (![1, -1, 0].includes(value)) return zeroed('invalid_value', 400);
  if (!anonId) return zeroed('missing_voter', 400);

  try {
    const res = await fetch(`${base}/api/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, value, voter: voterToken(anonId) }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return json({ available: true, ...(await res.json()) });
  } catch {
    return zeroed('unreachable', 502);
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export default { GET, POST, OPTIONS };

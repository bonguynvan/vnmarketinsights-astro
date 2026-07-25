// Lead capture -> Kit v4 API. Creates the subscriber via POST /v4/subscribers
// (X-Kit-Api-Key auth) — the reliable server-side path. We do NOT use the
// classic form endpoint (it quarantines server-to-server calls) nor
// /v4/forms/{id}/subscribers (404s for this account). POST /v4/subscribers is an
// upsert and returns the subscriber as "active" (single opt-in). Env-gated on
// KIT_API_KEY (503 when unset).

// Astro hybrid prerenders routes by default — opt out so this runs on-demand.
export const prerender = false;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KIT_API_BASE = 'https://api.kit.com/v4';
const KIT_TIMEOUT_MS = 8000;

type LeadPayload = {
  email?: string;
  source?: string;
  path?: string;
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function getApiKey(): string | undefined {
  return import.meta.env.KIT_API_KEY || process.env.KIT_API_KEY;
}

export async function POST({ request }: { request: Request }) {
  try {
    let payload: LeadPayload;
    try {
      payload = await request.json();
    } catch {
      return json({ success: false, error: 'Invalid JSON payload' }, 400);
    }

    const email = payload.email?.trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email)) {
      return json({ success: false, error: 'Invalid email address' }, 400);
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return json({ success: false, error: 'Email signup is being set up.' }, 503);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), KIT_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${KIT_API_BASE}/subscribers`, {
        method: 'POST',
        headers: {
          'X-Kit-Api-Key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ email_address: email }),
        signal: controller.signal
      });
    } catch (error) {
      console.error('Kit request failed:', error instanceof Error ? error.message : String(error));
      return json({ success: false, error: 'Subscription service unavailable.' }, 502);
    } finally {
      clearTimeout(timer);
    }

    if (res.ok) {
      // POST /v4/subscribers upserts and returns the subscriber as "active".
      return json({ success: true, status: 'subscribed' }, 200);
    }

    let detail = '';
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {
      /* ignore */
    }
    console.error('Kit v4 subscribe error:', res.status, detail);
    return json({ success: false, error: 'Could not subscribe right now.' }, 502);
  } catch (error) {
    console.error('subscribe handler error:', error instanceof Error ? error.message : String(error));
    return json({ success: false, error: 'Unexpected error.' }, 500);
  }
}

export async function GET() {
  return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' }
  });
}

// Lead capture -> Kit v4 API. Creates the subscriber via POST /v4/subscribers
// (X-Kit-Api-Key auth) — the reliable server-side path. We do NOT use the
// classic form endpoint (it quarantines server-to-server calls) nor
// /v4/forms/{id}/subscribers (404s for this account). POST /v4/subscribers is an
// upsert and returns the subscriber as "active" (single opt-in).
//
// If KIT_TAG_ID is set, the new subscriber is also tagged (best-effort) so a Kit
// automation ("added to tag -> send email") can deliver the lead magnet.
// Env-gated on KIT_API_KEY (503 when unset).

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

function getTagId(): string | undefined {
  return import.meta.env.KIT_TAG_ID || process.env.KIT_TAG_ID;
}

async function kitFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KIT_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
    const headers = { 'X-Kit-Api-Key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' };

    let res: Response;
    try {
      res = await kitFetch(`${KIT_API_BASE}/subscribers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email_address: email })
      });
    } catch (error) {
      console.error('Kit request failed:', error instanceof Error ? error.message : String(error));
      return json({ success: false, error: 'Subscription service unavailable.' }, 502);
    }

    if (res.ok) {
      // Best-effort tag so a Kit automation can deliver the lead magnet. Never
      // fails the subscribe — the subscriber is already created at this point.
      const tagId = getTagId();
      if (tagId) {
        try {
          const tagRes = await kitFetch(`${KIT_API_BASE}/tags/${encodeURIComponent(tagId)}/subscribers`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ email_address: email })
          });
          if (!tagRes.ok) {
            console.error('Kit tag add non-ok:', tagRes.status);
          }
        } catch (error) {
          console.error('Kit tag add failed:', error instanceof Error ? error.message : String(error));
        }
      }
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

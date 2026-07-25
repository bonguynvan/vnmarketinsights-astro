// Lead capture -> Kit v4 API. The classic form endpoint
// (app.kit.com/forms/{id}/subscriptions) quarantines server-to-server
// submissions (no browser anti-bot tokens), so subscribers silently vanish.
// The v4 API (api.kit.com/v4, X-Kit-Api-Key) is the correct server-side method.
// Env-gated on KIT_API_KEY + KIT_FORM_ID (503 when unset). Form must be published.

// Astro hybrid prerenders routes by default — opt out so this runs on-demand.
export const prerender = false;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KIT_API_BASE = 'https://api.kit.com/v4';
const KIT_TIMEOUT_MS = 8000;
// Temporary: lets a curl with {"diag":"<token>"} surface the Kit status + the
// account's real v4 form IDs. Removed once the correct form id is confirmed.
const DIAG_TOKEN = 'vmi-kit-diag-7970';

type LeadPayload = {
  email?: string;
  source?: string;
  path?: string;
  diag?: string;
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function getConfig(): { apiKey?: string; formId?: string } {
  return {
    apiKey: import.meta.env.KIT_API_KEY || process.env.KIT_API_KEY,
    formId: import.meta.env.KIT_FORM_ID || process.env.KIT_FORM_ID
  };
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

    const { apiKey, formId } = getConfig();
    if (!apiKey || !formId) {
      return json({ success: false, error: 'Email signup is being set up.' }, 503);
    }
    const isDiag = payload.diag === DIAG_TOKEN;
    const headers = { 'X-Kit-Api-Key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' };

    let res: Response;
    try {
      res = await kitFetch(`${KIT_API_BASE}/forms/${encodeURIComponent(formId)}/subscribers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email_address: email })
      });
    } catch (error) {
      console.error('Kit request failed:', error instanceof Error ? error.message : String(error));
      return json({ success: false, error: 'Subscription service unavailable.' }, 502);
    }

    if (res.ok) {
      return json({ success: true, status: 'pending_confirmation' }, 200);
    }

    let detail = '';
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {
      /* ignore */
    }
    console.error('Kit v4 subscribe error:', res.status, detail);

    if (isDiag) {
      const probe = async (method: string, url: string, body?: unknown) => {
        try {
          const r = await kitFetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
          let t = '';
          try { t = (await r.text()).slice(0, 160); } catch { /* ignore */ }
          return { status: r.status, body: t };
        } catch (e) {
          return { error: String(e) };
        }
      };
      const probes = {
        A_form_subscribers: await probe('POST', `${KIT_API_BASE}/forms/${formId}/subscribers`, { email_address: email }),
        B_create_subscriber: await probe('POST', `${KIT_API_BASE}/subscribers`, { email_address: email }),
        C_form_subscribe: await probe('POST', `${KIT_API_BASE}/forms/${formId}/subscribe`, { email_address: email })
      };
      return json({ success: false, debug: { usingFormId: formId, probes } }, 200);
    }

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

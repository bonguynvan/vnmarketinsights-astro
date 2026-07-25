// Lead capture -> Kit (formerly ConvertKit). Adding a subscriber to a Kit form
// creates them (if needed) AND triggers that form's incentive/confirmation email
// — which is our double opt-in + lead-magnet delivery. Kit is the durable store
// (no database needed). Env-gated on KIT_API_KEY + KIT_FORM_ID: when either is
// unset the endpoint returns 503 so the client shows a graceful retry message.

// Astro hybrid prerenders routes by default — opt out so this runs as an
// on-demand serverless function. Without this the route is baked to a static
// file and POST returns a platform 405 (every other /api route sets this).
export const prerender = false;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KIT_API_BASE = 'https://api.kit.com/v4';
const KIT_TIMEOUT_MS = 8000;

type LeadPayload = {
  email?: string;
  source?: string;
  path?: string;
  visitorCode?: string;
  referrerCode?: string;
  context?: Record<string, unknown>;
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function getConfig(): { apiKey?: string; formId?: string } {
  return {
    apiKey: import.meta.env.KIT_API_KEY || process.env.KIT_API_KEY,
    formId: import.meta.env.KIT_FORM_ID || process.env.KIT_FORM_ID
  };
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

    const source = typeof payload.source === 'string' ? payload.source : 'generic';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), KIT_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${KIT_API_BASE}/forms/${encodeURIComponent(formId)}/subscribers`, {
        method: 'POST',
        headers: {
          'X-Kit-Api-Key': apiKey, // Kit v4 personal-key auth header
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          email_address: email, // Kit's field is email_address
          referrer: payload.path || source
        }),
        signal: controller.signal
      });
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      return json({ success: false, error: 'Subscription service unavailable.', debug: { phase: 'fetch', message } }, 502);
    } finally {
      clearTimeout(timer);
    }

    if (res.ok) {
      // Double opt-in: the subscriber is pending until they confirm by email.
      return json({ success: true, status: 'pending_confirmation' }, 200);
    }

    let detail = '';
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    return json({ success: false, error: 'Could not subscribe right now.', debug: { phase: 'kit', status: res.status, detail } }, 502);
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return json({ success: false, error: 'Unexpected error.', debug: { phase: 'handler', message } }, 500);
  }
}

export async function GET() {
  return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' }
  });
}

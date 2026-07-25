// Lead capture -> Kit. Posts to Kit's public form-submission endpoint
// (app.kit.com/forms/{id}/subscriptions) — the exact path Kit's official embed
// uses — which subscribes the email to the form and triggers that form's double
// opt-in + incentive/lead-magnet email. No API key needed (the form ID is
// public); Kit is the durable store. Env-gated on KIT_FORM_ID (503 when unset).
//
// Note: we use the classic form endpoint, not the v4 API (api.kit.com/v4/...),
// because the v4 forms endpoint uses a different internal form-ID space and 404s
// on the embed/form ID.

// Astro hybrid prerenders routes by default — opt out so this runs as an
// on-demand serverless function (POST 405s as a static file otherwise).
export const prerender = false;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KIT_FORM_BASE = 'https://app.kit.com/forms';
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

function getFormId(): string | undefined {
  return import.meta.env.KIT_FORM_ID || process.env.KIT_FORM_ID;
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

    const formId = getFormId();
    if (!formId) {
      return json({ success: false, error: 'Email signup is being set up.' }, 503);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), KIT_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${KIT_FORM_BASE}/${encodeURIComponent(formId)}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email_address: email }),
        signal: controller.signal
      });
    } catch (error) {
      console.error('Kit form submit failed:', error instanceof Error ? error.message : String(error));
      return json({ success: false, error: 'Subscription service unavailable.' }, 502);
    } finally {
      clearTimeout(timer);
    }

    let data: { status?: string } | null = null;
    try {
      data = (await res.json()) as { status?: string };
    } catch {
      /* non-JSON body — ignore */
    }
    const kitStatus = data && typeof data.status === 'string' ? data.status : '';

    if (res.ok && (kitStatus === 'success' || kitStatus === 'quarantined')) {
      // Double opt-in: the subscriber is pending until they confirm by email.
      return json({ success: true, status: 'pending_confirmation' }, 200);
    }

    console.error('Kit form submit error:', res.status, JSON.stringify(data).slice(0, 300));
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

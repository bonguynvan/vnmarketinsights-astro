// Lead capture -> Buttondown. Buttondown is the durable store AND the email
// sender: double opt-in is on by default, so a new subscriber gets a
// confirmation email (which also delivers the lead magnet). Env-gated — without
// BUTTONDOWN_API_KEY the endpoint returns 503 so the client shows a graceful
// retry message, matching the repo's degrade-when-unset convention.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUTTONDOWN_SUBSCRIBERS = 'https://api.buttondown.com/v1/subscribers';

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

function getApiKey(): string | undefined {
  // Belt-and-suspenders: import.meta.env for build-time, process.env for the
  // value Vercel injects only at serverless runtime.
  return import.meta.env.BUTTONDOWN_API_KEY || process.env.BUTTONDOWN_API_KEY;
}

export async function POST({ request }: { request: Request }) {
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

  const source = typeof payload.source === 'string' ? payload.source : 'generic';

  let res: Response;
  try {
    res = await fetch(BUTTONDOWN_SUBSCRIBERS, {
      method: 'POST',
      headers: {
        // Buttondown uses "Token", NOT "Bearer".
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email_address: email, // Buttondown's field is email_address, not email.
        metadata: { source, path: payload.path || '' }
      })
    });
  } catch (error) {
    console.error('Buttondown request failed:', error);
    return json({ success: false, error: 'Subscription service unavailable.' }, 502);
  }

  if (res.ok) {
    // Double opt-in: the subscriber is pending until they click confirm.
    return json({ success: true, status: 'pending_confirmation' }, 200);
  }

  // A duplicate means they are already on the list — treat as success.
  let detail = '';
  try {
    detail = JSON.stringify(await res.json()).toLowerCase();
  } catch {
    /* body not JSON — ignore */
  }
  const isDuplicate =
    (res.status === 400 || res.status === 409) &&
    (detail.includes('already') || detail.includes('exists') || detail.includes('duplicate'));
  if (isDuplicate) {
    return json({ success: true, alreadySubscribed: true }, 200);
  }

  console.error('Buttondown subscribe error:', res.status, detail);
  return json({ success: false, error: 'Could not subscribe right now.' }, 502);
}

export async function GET() {
  return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' }
  });
}

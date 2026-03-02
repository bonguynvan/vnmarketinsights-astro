import { upsertPendingLead } from '@utils/leadStore';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LeadPayload = {
  email?: string;
  source?: string;
  path?: string;
  visitorCode?: string;
  referrerCode?: string;
  context?: Record<string, unknown>;
};

async function forwardToWebhook(payload: LeadPayload) {
  const webhook = import.meta.env.LEAD_WEBHOOK_URL;
  if (!webhook) return;

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Lead webhook forwarding failed:', error);
  }
}

export async function POST({ request }: { request: Request }) {
  let payload: LeadPayload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const email = payload.email?.trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid email address' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const safePayload: LeadPayload = {
    email,
    source: payload.source,
    path: payload.path,
    visitorCode: payload.visitorCode,
    referrerCode: payload.referrerCode,
    context: payload.context
  };

  const upsert = upsertPendingLead(safePayload);
  const origin = new URL(request.url).origin;
  const confirmLink = `${origin}/api/leads/confirm?token=${upsert.lead.confirmToken}`;
  const exposeConfirmLink = import.meta.env.DEV || import.meta.env.PUBLIC_EXPOSE_CONFIRM_LINK === 'true';

  if (upsert.status === 'already_confirmed') {
    return new Response(JSON.stringify({ success: true, alreadySubscribed: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  await forwardToWebhook({
    ...safePayload,
    context: {
      ...(safePayload.context || {}),
      confirmLink,
      confirmationStatus: upsert.status
    }
  });

  return new Response(JSON.stringify({
    success: true,
    status: 'pending_confirmation',
    ...(exposeConfirmLink ? { confirmLink } : {})
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function GET() {
  return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      Allow: 'POST'
    }
  });
}

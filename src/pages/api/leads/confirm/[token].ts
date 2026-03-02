import { confirmLeadByToken } from '@utils/leadStore';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function htmlPage(
  title: string,
  message: string,
  options: { eventName?: string } = {}
) {
  const gaId = import.meta.env.PUBLIC_GA_MEASUREMENT_ID || '';
  const escapedTitle = escapeHtml(title);
  const escapedMessage = escapeHtml(message);
  const eventName = options.eventName || '';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapedTitle}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 2rem; }
      .card { max-width: 560px; margin: 6rem auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; }
      h1 { margin-top: 0; font-size: 1.25rem; }
      p { color: #334155; line-height: 1.6; }
      a { color: #2563eb; text-decoration: none; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${escapedTitle}</h1>
      <p>${escapedMessage}</p>
      <p><a href="/">Back to Vietnam Market Insights</a></p>
    </div>
    <script>
      try {
        const key = 'vmi_growth_milestones';
        const current = JSON.parse(window.localStorage.getItem(key) || '{}');
        ${eventName === 'lead_confirmed'
          ? "current.lead_confirmed = true; current.lead_submitted = true; current.lead_pending_confirmation = false;"
          : ""}
        window.localStorage.setItem(key, JSON.stringify(current));
      } catch {}
    </script>
    ${gaId && eventName ? `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(gaId)}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', '${escapeHtml(gaId)}');
      gtag('event', '${escapeHtml(eventName)}', { event_category: 'acquisition', event_label: 'double_opt_in_confirm' });
    </script>
    ` : ''}
  </body>
</html>`;
}

export const prerender = false;

export async function GET({ params }: { params: { token?: string } }) {
  const token = params.token ? decodeURIComponent(params.token).trim() : '';
  if (!token) {
    return new Response(htmlPage('Invalid confirmation link', 'This link is missing a token.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  const result = confirmLeadByToken(token);
  if (result.status === 'confirmed') {
    return new Response(htmlPage('Subscription confirmed', 'Your email is confirmed. You will receive future weekly briefs.', {
      eventName: 'lead_confirmed'
    }), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  if (result.status === 'already_confirmed') {
    return new Response(htmlPage('Already confirmed', 'This email has already been confirmed.'), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  return new Response(htmlPage('Link expired or invalid', 'Please submit your email again from the site to receive a fresh confirmation link.'), {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

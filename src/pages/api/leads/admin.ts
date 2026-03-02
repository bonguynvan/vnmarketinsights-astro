import { getLeadAdminSnapshot } from '@utils/leadStore';

function isAuthorized(request: Request) {
  const adminKey = import.meta.env.ADMIN_LEADS_KEY;
  if (!adminKey) return false;
  const url = new URL(request.url);
  const keyFromHeader = request.headers.get('x-admin-key') || '';
  if (keyFromHeader === adminKey) return true;
  const allowQueryKey = import.meta.env.ALLOW_ADMIN_KEY_QUERY === 'true';
  if (!allowQueryKey) return false;
  const keyFromQuery = url.searchParams.get('key') || '';
  return keyFromQuery === adminKey;
}

export async function GET({ request }: { request: Request }) {
  if (!import.meta.env.ADMIN_LEADS_KEY) {
    return new Response(JSON.stringify({ success: false, error: 'ADMIN_LEADS_KEY not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') || '100');
  const data = getLeadAdminSnapshot(limit);

  return new Response(JSON.stringify({ success: true, ...data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

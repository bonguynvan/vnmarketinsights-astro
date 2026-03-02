import { getRequestUrl } from '@utils/requestUrl';
export const prerender = false;

export async function GET({ request, url }: { request: Request; url: URL }) {
    const resolvedUrl = getRequestUrl(request, url);
    return new Response(JSON.stringify({
        success: true,
        receivedUrl: resolvedUrl.toString(),
        searchParams: Object.fromEntries(resolvedUrl.searchParams.entries())
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

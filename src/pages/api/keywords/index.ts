import { getSimulatedKeywords, generateKeywordInsight } from '@utils/keywordEngine';
import { getRequestUrl } from '@utils/requestUrl';
export const prerender = false;

export async function GET({ request }: { request: Request }) {
    const url = getRequestUrl(request);
    const seed = url.searchParams.get('q');
    return mineKeywords(seed);
}

export async function POST({ request }: { request: Request }) {
    let payload: { q?: string } = {};
    try {
        payload = await request.json();
    } catch {
        return new Response(JSON.stringify({ success: false, error: 'Invalid JSON payload' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    return mineKeywords(payload.q || '');
}

function mineKeywords(seed: string | null | undefined) {
    if (!seed || seed.length < 2) {
        return new Response(JSON.stringify({ success: false, error: 'Query too short' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const suggestions = getSimulatedKeywords(seed);
        const insight = generateKeywordInsight(seed, suggestions);

        return new Response(JSON.stringify({
            success: true,
            data: {
                keywords: suggestions,
                insight
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

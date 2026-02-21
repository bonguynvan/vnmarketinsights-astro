import { getSimulatedKeywords, generateKeywordInsight } from '@utils/keywordEngine';

export async function GET({ request }: { request: Request }) {
    const url = new URL(request.url);
    const seed = url.searchParams.get('q');

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

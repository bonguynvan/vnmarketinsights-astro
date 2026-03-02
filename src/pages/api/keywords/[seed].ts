import { getSimulatedKeywords, generateKeywordInsight } from '@utils/keywordEngine';
export const prerender = false;

export async function GET({ params }: { params: { seed?: string } }) {
  const seed = params.seed ? decodeURIComponent(params.seed).trim() : '';
  if (!seed || seed.length < 2) {
    return new Response(JSON.stringify({ success: false, error: 'Query too short' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const suggestions = getSimulatedKeywords(seed);
    const insight = generateKeywordInsight(seed, suggestions);
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          keywords: suggestions,
          insight
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

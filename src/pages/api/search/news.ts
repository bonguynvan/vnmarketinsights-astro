export const prerender = false;
import { runSmartSearch } from '@utils/newsSearch';

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const lang: 'en' | 'vi' = url.searchParams.get('lang') === 'vi' ? 'vi' : 'en';

  try {
    const analysis = await runSmartSearch(query, lang);

    return new Response(JSON.stringify({ success: true, ...analysis }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Precomputed corpus + one light embedding call; safe to cache briefly.
        'Cache-Control': 'public, max-age=600',
      },
    });
  } catch (error) {
    console.error('Semantic search API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred while searching the enriched news corpus.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

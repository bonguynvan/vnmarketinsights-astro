import { runSmartSearch } from '@utils/newsFeed';

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';

  try {
    const analysis = await runSmartSearch(query);

    return new Response(JSON.stringify({ success: true, ...analysis }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600' // cache response for 10 minutes
      }
    });
  } catch (error) {
    console.error('Smart Search API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred while searching and analysing news.'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

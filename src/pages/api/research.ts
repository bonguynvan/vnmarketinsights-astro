export const prerender = false;

/**
 * On-demand research endpoint.
 *
 *  - If PERPLEXITY_API_KEY is set → live-web answer + citations via Sonar.
 *  - Otherwise (or if Sonar errors) → graceful fallback to the existing
 *    AI-enriched news-corpus search (runSmartSearch). The endpoint always
 *    returns something useful, and upgrades automatically once the key is added.
 *
 * Unified response shape so the page renders both modes the same way:
 *   { success, available, source: 'sonar'|'corpus', query, answer, citations:[{title,url,source?}], note? }
 */
import { researchWithSonar, PerplexityNotConfigured } from '@utils/perplexityResearch';
import { runSmartSearch } from '@utils/newsSearch';

const json = (body: object, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });

async function corpusFallback(query: string, lang: 'en' | 'vi', note: string) {
  const a = await runSmartSearch(query, lang);
  return {
    success: true,
    available: true,
    source: 'corpus' as const,
    query,
    answer: a.aiSynthesis,
    citations: a.articles.slice(0, 10).map((art) => ({
      title: art.title,
      url: art.link,
      source: art.source,
    })),
    note,
  };
}

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim();
  const lang: 'en' | 'vi' = url.searchParams.get('lang') === 'vi' ? 'vi' : 'en';

  if (!query) {
    return json({ success: false, available: false, error: 'Missing query (?q=)' }, 400);
  }

  // Preferred path: live-web research via Sonar.
  try {
    const r = await researchWithSonar(query, lang);
    return json({
      success: true,
      available: true,
      source: 'sonar',
      query,
      answer: r.answer,
      citations: r.citations,
      model: r.model,
    });
  } catch (err) {
    const notConfigured = err instanceof PerplexityNotConfigured;
    if (!notConfigured) console.warn('Sonar research failed, falling back to corpus:', err);

    // Graceful fallback to the enriched news corpus.
    try {
      return json(
        await corpusFallback(
          query,
          lang,
          notConfigured
            ? 'Answered from our Vietnam news corpus. Live-web research will activate once configured.'
            : 'Live-web research was unavailable; answered from our Vietnam news corpus.',
        ),
      );
    } catch (fallbackErr) {
      console.error('Research fallback failed:', fallbackErr);
      return json({ success: false, available: false, error: 'Research is temporarily unavailable.' }, 500);
    }
  }
}

export default { GET };

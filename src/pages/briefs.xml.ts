import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://vnmarketinsights.com';
const FEED_TITLE = 'Vietnam Market Insights — Weekly Briefs';
const FEED_DESCRIPTION =
  'Weekly AI-summarized digest of Vietnam market and business news, grouped by topic with sources.';

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const toRfc822 = (date: Date): string => date.toUTCString();

export const GET: APIRoute = async () => {
  // EN market briefs only: category "Market Brief", excluding the -vi variants.
  const briefs = (await getCollection('articles'))
    .filter((entry) => entry.data.category === 'Market Brief' && !entry.slug.endsWith('-vi'))
    .sort((a, b) => {
      const at = new Date(a.data.publishedDate ?? 0).valueOf();
      const bt = new Date(b.data.publishedDate ?? 0).valueOf();
      return bt - at;
    });

  const latest = briefs[0]?.data.lastUpdated || briefs[0]?.data.publishedDate;
  const lastBuildDate = latest ? toRfc822(new Date(latest)) : toRfc822(new Date());

  const items = briefs
    .map((entry) => {
      const url = `${SITE}/insights/${entry.slug}/`;
      const pubDate = entry.data.publishedDate
        ? toRfc822(new Date(entry.data.publishedDate))
        : lastBuildDate;
      return `    <item>
      <title>${escapeXml(entry.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(entry.data.description ?? '')}</description>
      <category>Market Brief</category>
    </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE}/insights</link>
    <atom:link href="${SITE}/briefs.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

export const prerender = true;

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://vnmarketinsights.com';
const FEED_TITLE = 'Vietnam Market Insights';
const FEED_DESCRIPTION =
  "Structured reference articles on Vietnam's digital economy: ecommerce, fintech, logistics, regulations, and financial markets.";

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(date: Date): string {
  return date.toUTCString();
}

export const GET: APIRoute = async () => {
  const articles = await getCollection('articles');
  const sorted = articles
    .filter((entry) => entry.data.publishedDate)
    .sort((a, b) => {
      const aTime = new Date(a.data.publishedDate as string).valueOf();
      const bTime = new Date(b.data.publishedDate as string).valueOf();
      return bTime - aTime;
    });

  const latestDate = sorted[0]?.data.lastUpdated || sorted[0]?.data.publishedDate;
  const lastBuildDate = latestDate ? toRfc822(new Date(latestDate)) : toRfc822(new Date());

  const items = sorted
    .map((entry) => {
      const url = `${SITE}/insights/${entry.slug}/`;
      const pubDate = entry.data.publishedDate
        ? toRfc822(new Date(entry.data.publishedDate))
        : lastBuildDate;
      const description = entry.data.description || '';
      const category = entry.data.category ? `\n      <category>${escapeXml(entry.data.category)}</category>` : '';
      return `    <item>
      <title>${escapeXml(entry.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>${category}
    </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE}</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
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

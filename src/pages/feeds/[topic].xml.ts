import type { APIRoute } from 'astro';
import recent from '../../data/recent-by-topic.json';

const SITE = 'https://vnmarketinsights.com';

const TOPIC_LABELS: Record<string, string> = {
  payments: 'Payments',
  ecommerce: 'E-commerce',
  logistics: 'Logistics',
  consumers: 'Consumers',
  regulations: 'Regulation',
  'financial-markets': 'Financial Markets',
  platforms: 'Platforms',
};

interface RecentItem {
  title: string;
  url: string;
  source: string;
  summary_en: string;
  pubDate: string;
}

const TOPICS = ((recent as any).topics ?? {}) as Record<string, RecentItem[]>;

export function getStaticPaths() {
  // One feed per known site topic, even if currently empty.
  return Object.keys(TOPIC_LABELS).map((topic) => ({ params: { topic } }));
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const toRfc822 = (d: string): string => {
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? new Date().toUTCString() : parsed.toUTCString();
};

export const GET: APIRoute = ({ params }) => {
  const topic = params.topic as string;
  const label = TOPIC_LABELS[topic] ?? topic;
  const items = TOPICS[topic] ?? [];

  const itemsXml = items
    .map(
      (it) => `    <item>
      <title>${escapeXml(it.title)}</title>
      <link>${escapeXml(it.url)}</link>
      <guid isPermaLink="true">${escapeXml(it.url)}</guid>
      <pubDate>${toRfc822(it.pubDate)}</pubDate>
      <source url="${SITE}/${topic}">${escapeXml(it.source)}</source>
      <description>${escapeXml(it.summary_en ?? '')}</description>
    </item>`,
    )
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Vietnam Market Insights — ${escapeXml(label)}</title>
    <link>${SITE}/${topic}</link>
    <atom:link href="${SITE}/feeds/${topic}.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(`Recent AI-summarized Vietnam ${label} news, with source links.`)}</description>
    <language>en-us</language>
${itemsXml}
  </channel>
</rss>
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  });
};

export const prerender = true;

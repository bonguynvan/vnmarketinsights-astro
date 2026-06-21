import type { APIRoute } from 'astro';

const SITE = 'https://vnmarketinsights.com';

export const GET: APIRoute = async () => {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Vietnam Market Insights — Feeds</title>
  </head>
  <body>
    <outline text="Vietnam Market Insights" title="Vietnam Market Insights">
      <outline type="rss" text="Articles &amp; Insights" title="Articles &amp; Insights"
        xmlUrl="${SITE}/rss.xml" htmlUrl="${SITE}/insights" />
      <outline type="rss" text="Weekly Briefs" title="Weekly Briefs"
        xmlUrl="${SITE}/briefs.xml" htmlUrl="${SITE}/insights" />
    </outline>
  </body>
</opml>
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/x-opml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};

export const prerender = true;

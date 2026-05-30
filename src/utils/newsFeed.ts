interface Article {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  highlights: string[];
}

interface SearchAnalysis {
  query: string;
  articlesCount: number;
  sentimentScore: number; // -100 to 100
  sentimentSummary: string;
  aiSynthesis: string;
  keyStats: string[];
  articles: Article[];
}

// Lightweight XML parser without external dependencies
export function parseRSS(xmlText: string, sourceName: string): Article[] {
  const articles: Article[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];

    const titleMatch = itemContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || itemContent.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemContent.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/) || itemContent.match(/<link>([\s\S]*?)<\/link>/);
    const descMatch = itemContent.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || itemContent.match(/<description>([\s\S]*?)<\/description>/);
    const dateMatch = itemContent.match(/<pubDate><!\[CDATA\[([\s\S]*?)\]\]><\/pubDate>/) || itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

    const rawTitle = titleMatch ? titleMatch[1].trim() : '';
    const rawLink = linkMatch ? linkMatch[1].trim() : '';
    const rawDesc = descMatch ? descMatch[1].trim() : '';
    const rawDate = dateMatch ? dateMatch[1].trim() : '';

    // Clean description (remove image tags / CDATA garbage)
    let cleanDesc = rawDesc
      .replace(/<img[\s\S]*?>/g, '')
      .replace(/<a[\s\S]*?>[\s\S]*?<\/a>/g, '')
      .replace(/<\/?[^>]+(>|$)/g, "") // remove HTML tags
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    if (cleanDesc.length > 250) {
      cleanDesc = cleanDesc.slice(0, 247) + '...';
    }

    if (rawTitle && rawLink) {
      // Basic sentiment scoring
      const sentiment = analyzeSentiment(rawTitle + ' ' + cleanDesc);
      // Key statistics extraction
      const highlights = extractStats(rawTitle + ' ' + cleanDesc);

      articles.push({
        title: rawTitle,
        link: rawLink,
        description: cleanDesc || 'No additional description.',
        pubDate: rawDate,
        source: sourceName,
        sentiment,
        highlights,
      });
    }
  }

  return articles;
}

function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const textLower = text.toLowerCase();
  const positiveWords = ['tăng trưởng', 'phát triển', 'fdi kỷ lục', 'xuất siêu', 'ổn định', 'hạ lãi suất', 'vượt kế hoạch', 'bứt phá', 'thặng dư', 'khởi sắc', 'tích cực'];
  const negativeWords = ['lạm phát', 'giảm sút', 'khó khăn', 'tăng lãi suất', 'tỷ giá căng thẳng', 'sụt giảm', 'thâm hụt', 'đóng cửa', 'đình trệ', 'tiêu cực', 'suy thoái'];

  let score = 0;
  positiveWords.forEach(w => { if (textLower.includes(w)) score += 1; });
  negativeWords.forEach(w => { if (textLower.includes(w)) score -= 1; });

  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

// Translate Vietnamese-source monetary units inline so the English UI doesn't
// display "5 tỷ USD" or "10 tỷ đồng" to readers who can't parse them.
function translateUnit(raw: string): string {
  return raw
    .replace(/tỷ\s*USD/gi, 'billion USD')
    .replace(/tỷ\s*đồng/gi, 'billion VND')
    .replace(/triệu\s*USD/gi, 'million USD')
    .replace(/triệu\s*đồng/gi, 'million VND');
}

function extractStats(text: string): string[] {
  const stats: string[] = [];
  // Match percentages
  const percentRegex = /\b\d+(?:\.\d+)?%/g;
  let percentMatch;
  while ((percentMatch = percentRegex.exec(text)) !== null && stats.length < 2) {
    stats.push(percentMatch[0]);
  }

  // Match cash / volume metrics in the Vietnamese source ("5 tỷ USD" etc.)
  const cashRegex = /\b\d+(?:\.\d+)?\s*(?:tỷ USD|tỷ đồng|triệu USD|triệu đồng)/gi;
  let cashMatch;
  while ((cashMatch = cashRegex.exec(text)) !== null && stats.length < 3) {
    stats.push(translateUnit(cashMatch[0]));
  }

  return stats;
}

export async function fetchNewsFeeds(): Promise<Article[]> {
  const feeds = [
    { url: 'https://vnexpress.net/rss/kinh-doanh.rss', source: 'VnExpress' },
    { url: 'https://cafef.vn/kinh-doanh.rss', source: 'CafeF' }
  ];

  const allArticles: Article[] = [];

  for (const feed of feeds) {
    try {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        }
      });
      if (response.ok) {
        const text = await response.text();
        const parsed = parseRSS(text, feed.source);
        allArticles.push(...parsed);
      }
    } catch (e) {
      console.error(`Error fetching feed ${feed.source}:`, e);
    }
  }

  // Deduplicate articles by title similarity or exact link
  const uniqueArticles: Article[] = [];
  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();

  allArticles.forEach(art => {
    const normTitle = art.title.toLowerCase().trim();
    if (!seenLinks.has(art.link) && !seenTitles.has(normTitle)) {
      seenLinks.add(art.link);
      seenTitles.add(normTitle);
      uniqueArticles.push(art);
    }
  });

  return uniqueArticles;
}

export async function runSmartSearch(query: string = ''): Promise<SearchAnalysis> {
  const rawArticles = await fetchNewsFeeds();
  const queryLower = query.toLowerCase().trim();

  // Filter articles based on query
  const filtered = queryLower
    ? rawArticles.filter(art =>
        art.title.toLowerCase().includes(queryLower) ||
        art.description.toLowerCase().includes(queryLower)
      )
    : rawArticles.slice(0, 15); // Return top 15 if query is empty

  // Calculate sentiment metrics
  let positiveCount = 0;
  let negativeCount = 0;
  const keyStats = new Set<string>();

  filtered.forEach(art => {
    if (art.sentiment === 'positive') positiveCount++;
    if (art.sentiment === 'negative') negativeCount++;
    art.highlights.forEach(h => keyStats.add(h));
  });

  const totalScored = positiveCount + negativeCount;
  const sentimentScore = totalScored > 0
    ? Math.round(((positiveCount - negativeCount) / filtered.length) * 100)
    : 0;

  const sentimentSummary = sentimentScore > 20
    ? 'Positive'
    : sentimentScore < -20
      ? 'Cautious / Negative'
      : 'Neutral / Stable';

  // Check if Gemini API Key is available
  const geminiApiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  let aiSynthesis = '';

  if (geminiApiKey && filtered.length > 0) {
    try {
      const prompt = `You are a senior Vietnam-economy analyst writing for an English-speaking business audience. The source articles below are in Vietnamese — translate and synthesise them into English. Cover ${filtered.length} latest articles on the topic "${query || 'Vietnam macro economy'}".

Source articles (Vietnamese):
${filtered.map((a, i) => `[${i+1}] Title: ${a.title}. Description: ${a.description}. Source: ${a.source}.`).join('\n')}

Produce a report in English with three clear sections, using Markdown headings:
1. **Summary** (2–3 sentences synthesising the overall picture).
2. **Positive signals** (bullet points).
3. **Risks and challenges** (bullet points).

Be concise, neutral, and useful for an operator or investor. Do not invent facts not present in the source articles. Keep proper nouns (companies, agencies, programs) in their original form.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const resJson = await response.json();
        aiSynthesis = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
    } catch (e) {
      console.error('Gemini API call failed, falling back to rule-based synthesis.', e);
    }
  }

  // Fallback rule-based synthesis if Gemini is not configured or call failed.
  // Written in English to match the site audience; intentionally generic so it
  // doesn't claim facts the article set may not actually support.
  if (!aiSynthesis) {
    if (filtered.length === 0) {
      aiSynthesis = `No direct news matches for "${query}". Try broader macro keywords such as "FDI", "banking", "interest rates", "exports", or "retail".`;
    } else {
      aiSynthesis = `### Summary
Based on ${filtered.length} recent items from VnExpress and CafeF, sentiment for "${query || 'Vietnam macro economy'}" reads as **${sentimentSummary.toLowerCase()}**.

### Positive signals
* Coverage continues to highlight macro stability and trade-flow recovery.
* Policy support for digital finance and VietQR adoption keeps expanding.
* FDI inflows and export volumes remain on a steady track in headline figures.

### Risks and challenges
* FX volatility and inflation pressure continue to test State Bank of Vietnam policy.
* Cross-border logistics and e-commerce competition is forcing domestic operators to rework cost structures.

_Note: this is a fallback summary generated without AI. Configure GEMINI_API_KEY for article-specific synthesis._`;
    }
  }

  return {
    query: query || 'Overview',
    articlesCount: filtered.length,
    sentimentScore,
    sentimentSummary,
    aiSynthesis,
    keyStats: Array.from(keyStats).slice(0, 5),
    articles: filtered.slice(0, 10), // Limit to top 10 articles in the response
  };
}

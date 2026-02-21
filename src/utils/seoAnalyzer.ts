/**
 * Vietnam Website Snapshot - SEO Analyzer
 * Basic SEO metric calculation and analysis
 */

export interface SEOResults {
    title: string;
    description: string;
    h1Count: number;
    viewportMeta: boolean;
    score: number; // 0-100
    issues: string[];
}

export function analyzeSEO(html: string): SEOResults {
    const issues: string[] = [];
    let score = 100;

    // Title
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    if (!title) {
        issues.push('Missing <title> tag');
        score -= 20;
    } else if (title.length < 30 || title.length > 70) {
        issues.push('Title length suboptimal (ideal 30-70 chars)');
        score -= 5;
    }

    // Description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i) ||
        html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i);
    const description = descMatch ? descMatch[1].trim() : '';
    if (!description) {
        issues.push('Missing meta description');
        score -= 20;
    } else if (description.length < 120 || description.length > 160) {
        issues.push('Description length suboptimal (ideal 120-160 chars)');
        score -= 5;
    }

    // H1
    const h1Count = (html.match(/<h1/gi) || []).length;
    if (h1Count === 0) {
        issues.push('Missing H1 heading');
        score -= 15;
    } else if (h1Count > 1) {
        issues.push('Multiple H1 headings (should be unique per page)');
        score -= 10;
    }

    // Viewport
    const viewportMeta = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(html);
    if (!viewportMeta) {
        issues.push('Missing viewport meta tag (not mobile-friendly)');
        score -= 20;
    }

    return {
        title,
        description,
        h1Count,
        viewportMeta,
        score: Math.max(0, score),
        issues
    };
}

import { detectTechnologies } from '@utils/techDetector';
import { analyzeSEO } from '@utils/seoAnalyzer';

export async function GET({ request }: { request: Request }) {
    const url = new URL(request.url);
    const domain = url.searchParams.get('url');

    if (!domain) {
        return new Response(JSON.stringify({ success: false, error: 'Domain is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Normalize URL
    let targetUrl = domain;
    if (!targetUrl.startsWith('http')) {
        targetUrl = `https://${targetUrl}`;
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch website (${response.status})`);
        }

        const html = await response.text();
        const techStack = detectTechnologies(html);
        const seo = analyzeSEO(html);

        // Heuristic Traffic Tier
        let trafficTier = 'Low';
        if (techStack.some(t => ['Google Analytics', 'Facebook Pixel'].includes(t.name))) trafficTier = 'Medium';
        if (techStack.length > 5) trafficTier = 'High';

        return new Response(JSON.stringify({
            success: true,
            data: {
                domain: new URL(targetUrl).hostname,
                techStack,
                seo,
                metrics: {
                    trafficTier,
                    pageSize: (html.length / 1024).toFixed(1) + ' KB',
                    isMobileFriendly: seo.viewportMeta
                }
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Error analyzing website'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

import { detectTechnologies } from '@utils/techDetector';
import { analyzeSEO } from '@utils/seoAnalyzer';
import { getRequestUrl } from '@utils/requestUrl';
export const prerender = false;

function isPrivateIp(hostname: string) {
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!ipv4Match) return false;
    const [a, b] = [Number(ipv4Match[1]), Number(ipv4Match[2])];
    if ([a, b].some((segment) => Number.isNaN(segment) || segment < 0 || segment > 255)) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
}

function isBlockedHostname(hostname: string) {
    const lower = hostname.toLowerCase();
    if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) return true;
    if (lower === '::1') return true;
    if (lower.includes(':') && !lower.includes('.')) return true;
    return isPrivateIp(lower);
}

function normalizeTargetUrl(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return { error: 'Domain is required' };
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let parsed: URL;
    try {
        parsed = new URL(candidate);
    } catch {
        return { error: 'Invalid domain format' };
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { error: 'Only HTTP/HTTPS URLs are supported' };
    }
    if (!parsed.hostname || parsed.hostname.length > 255) {
        return { error: 'Invalid hostname' };
    }
    if (isBlockedHostname(parsed.hostname)) {
        return { error: 'This target is blocked for security reasons' };
    }
    return { url: parsed };
}

export async function GET({ request }: { request: Request }) {
    const url = getRequestUrl(request);
    const domain = url.searchParams.get('url');
    return analyzeDomain(domain);
}

export async function POST({ request }: { request: Request }) {
    let payload: { url?: string } = {};
    try {
        payload = await request.json();
    } catch {
        return new Response(JSON.stringify({ success: false, error: 'Invalid JSON payload' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    return analyzeDomain(payload.url || '');
}

async function analyzeDomain(domain: string | null | undefined) {
    if (!domain) {
        return new Response(JSON.stringify({ success: false, error: 'Domain is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    const normalized = normalizeTargetUrl(domain);
    if ('error' in normalized) {
        return new Response(JSON.stringify({ success: false, error: normalized.error }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    const targetUrl = normalized.url.toString();

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
                domain: normalized.url.hostname,
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
        const message = String(error?.message || 'Error analyzing website');
        const status = message.includes('Failed to fetch website') ? 502 : 500;
        return new Response(JSON.stringify({
            success: false,
            error: message
        }), {
            status,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

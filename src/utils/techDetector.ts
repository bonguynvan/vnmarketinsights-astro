/**
 * Vietnam Website Snapshot - Tech Detector
 * Pattern matching for common web technologies
 */

export interface TechStack {
    name: string;
    category: string;
    confidence: number; // 0-100
}

const TECH_PATTERNS = [
    { name: 'WordPress', category: 'CMS', patterns: [/wp-content/i, /wp-includes/i, /wp-json/i] },
    { name: 'React', category: 'Frontend', patterns: [/_next/i, /react-dom/i, /react-root/i] },
    { name: 'Vue', category: 'Frontend', patterns: [/v-cloak/i, /data-v-/i, /nuxt/i] },
    { name: 'Shopify', category: 'Ecommerce', patterns: [/shopify\.com/i, /cdn\.shopify/i, /Shopify\.shop/i] },
    { name: 'Haravan', category: 'Ecommerce', patterns: [/haravan\.com/i, /hstatic\.net/i] },
    { name: 'Sapo', category: 'Ecommerce', patterns: [/sapo\.vn/i, /bizweb\.vn/i] },
    { name: 'Next.js', category: 'Frontend Framework', patterns: [/_next/i, /__NEXT_DATA__/i] },
    { name: 'Tailwind CSS', category: 'CSS Framework', patterns: [/\.tw-/i, /tailwind/i] },
    { name: 'Google Analytics', category: 'Analytics', patterns: [/google-analytics\.com/i, /gtag/i, /UA-/i, /G-/i] },
    { name: 'Facebook Pixel', category: 'Marketing', patterns: [/facebook\.net\/en_US\/fbevents\.js/i, /fbq/i] }
];

export function detectTechnologies(html: string): TechStack[] {
    const detected: TechStack[] = [];

    TECH_PATTERNS.forEach(tech => {
        const matchCount = tech.patterns.filter(p => p.test(html)).length;
        if (matchCount > 0) {
            detected.push({
                name: tech.name,
                category: tech.category,
                confidence: Math.min(100, (matchCount / tech.patterns.length) * 100)
            });
        }
    });

    return detected;
}

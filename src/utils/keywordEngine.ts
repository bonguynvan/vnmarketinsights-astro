/**
 * Vietnam Ecommerce Keyword Growth Tracker - Engine
 * Handles keyword suggestions, search volume simulation, and clustering
 */

export interface KeywordTrend {
    keyword: string;
    volume: number;
    growth: number;
    competition: number; // 0-100
    status: 'Rising' | 'Stable' | 'Declining';
}

/**
 * Simulates growth based on keyword length and randomness
 */
export function calculateKeywordGrowth(keyword: string): number {
    const base = 20 + Math.random() * 50;
    return keyword.length > 15 ? base + 30 : base;
}

/**
 * Groups keywords into clusters (Placeholder for AI layer)
 */
export function generateKeywordInsight(keyword: string, suggestions: KeywordTrend[]): string {
    const top = suggestions.sort((a, b) => b.growth - a.growth)[0];
    if (!top) return `No significant trends found for "${keyword}".`;

    return `The search cluster around "${keyword}" is showing strong momentum, particularly for "${top.keyword}" with a ${top.growth.toFixed(1)}% increase in interest. This suggests a shift toward specialized consumer needs in this category.`;
}

/**
 * Returns mock suggestions based on a seed keyword
 */
export function getSimulatedKeywords(seed: string): KeywordTrend[] {
    const variations = [
        '', ' giá rẻ', ' chính hãng', ' cao cấp', ' review', ' cho nam', ' cho nữ', ' mới nhất 2024'
    ];

    return variations.map(v => {
        const keyword = seed + v;
        const growth = calculateKeywordGrowth(keyword);
        return {
            keyword,
            volume: 5000 + Math.floor(Math.random() * 50000),
            growth,
            competition: Math.floor(Math.random() * 100),
            status: growth > 50 ? 'Rising' : (growth > 10 ? 'Stable' : 'Declining')
        };
    });
}

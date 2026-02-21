/**
 * Vietnam Ecommerce Trend Radar Engine
 * Handles trend scoring, category insights, and market simulation data
 */

export interface ProductTrend {
  id: string;
  name: string;
  category: string;
  avgPrice: number;
  growthRate: number;
  trendScore: number;
  tag: 'Stable' | 'Flash Trend' | 'Saturated' | 'Emerging' | 'Rising Star';
  description?: string;
}

export interface MarketInsight {
  title: string;
  summary: string;
  keyPoints: string[];
}

export interface SummaryStats {
  avgScore: number;
  avgGrowth: number;
  topCategory: string;
}

/**
 * Calculates summary statistics for a set of products
 */
export function calculateSummaryStats(products: ProductTrend[]): SummaryStats {
  if (products.length === 0) {
    return { avgScore: 0, avgGrowth: 0, topCategory: 'N/A' };
  }

  const avgScore = products.reduce((acc, p) => acc + p.trendScore, 0) / products.length;
  const avgGrowth = products.reduce((acc, p) => acc + p.growthRate, 0) / products.length;

  const categoryCounts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0];

  return { avgScore, avgGrowth, topCategory };
}

/**
 * Calculates a trend score (0-100) based on growth and volume
 */
export function calculateTrendScore(growth: number, volumeFactor: number = 0.5): number {
  // Normalize growth: 100% growth = 80 points, capped at 100
  const growthScore = Math.min(100, Math.max(0, growth * 0.8));
  // Combine with volume/relevance factor
  const finalScore = (growthScore * 0.7) + (volumeFactor * 100 * 0.3);
  return Math.round(finalScore);
}

/**
 * Determines trend tag based on metrics
 */
export function getTrendTag(growth: number, score: number): ProductTrend['tag'] {
  if (growth > 80 && score > 90) return 'Flash Trend';
  if (growth > 40) return 'Rising Star';
  if (growth > 20) return 'Emerging';
  if (growth < 5) return 'Saturated';
  return 'Stable';
}

/**
 * Generates an "AI-style" summary based on current top category
 */
export function generateInsightSummary(topCategory: string): MarketInsight {
  const summaries: Record<string, MarketInsight> = {
    'Electronics': {
      title: 'Tech Surge in Urban Hubs',
      summary: 'High demand for mobile accessories and smart home devices driven by seasonal promotions and new model launches.',
      keyPoints: [
        'Premium smartphone demand remains resilient despite inflation.',
        'Smart wearables showing 40% WoW growth in Gen Z segment.',
        'Energy-efficient appliances gaining traction in HCM City.'
      ]
    },
    'Beauty & Personal Care': {
      title: 'Skincare Routine Optimization',
      summary: 'Consumers are shifting towards organic and specialized dermatological products, favoring brands with transparent ingredient lists.',
      keyPoints: [
        'Sunscreen products see 60% increase as outdoor events return.',
        'Men\'s grooming category expanding into specialized niche products.',
        'Local VN beauty brands gaining market share from mid-tier imports.'
      ]
    },
    'General': {
      title: 'Vibrant Omni-channel Growth',
      summary: 'Positive momentum across all sectors as logistics improve and digital payment adoption hits a new record.',
      keyPoints: [
        'Social commerce (TikTok Shop) contributing significantly to impulse buys.',
        'Average basket size increased by 15% compared to last period.',
        'High-interest in sustainable packaging options.'
      ]
    }
  };

  return summaries[topCategory] || summaries['General'];
}

/**
 * High-quality 2024-2025 Market Simulation Data
 */
export const SIMULATED_TREND_DATA: ProductTrend[] = [
  {
    id: 'vn-t-001',
    name: 'iPhone 16 Pro Max',
    category: 'Electronics',
    avgPrice: 34990000,
    growthRate: 125.4,
    trendScore: 98,
    tag: 'Flash Trend'
  },
  {
    id: 'vn-t-002',
    name: 'Kem chống nắng Skin1004 Centella',
    category: 'Beauty & Personal Care',
    avgPrice: 355000,
    growthRate: 65.2,
    trendScore: 88,
    tag: 'Rising Star'
  },
  {
    id: 'vn-t-003',
    name: 'Máy lọc không khí Xiaomi Elite',
    category: 'Home & Living',
    avgPrice: 4290000,
    growthRate: 42.1,
    trendScore: 75,
    tag: 'Rising Star'
  },
  {
    id: 'vn-t-004',
    name: 'Thời trang Y2K Style Crop Top',
    category: 'Fashion',
    avgPrice: 185000,
    growthRate: 58.5,
    trendScore: 82,
    tag: 'Rising Star'
  },
  {
    id: 'vn-t-005',
    name: 'Tai nghe Sony WH-1000XM5',
    category: 'Electronics',
    avgPrice: 8490000,
    growthRate: 12.4,
    trendScore: 65,
    tag: 'Stable'
  },
  {
    id: 'vn-t-006',
    name: 'Sữa hạt dinh dưỡng TH True Nut',
    category: 'Food & Beverage',
    avgPrice: 480000,
    growthRate: 35.8,
    trendScore: 72,
    tag: 'Emerging'
  }
];

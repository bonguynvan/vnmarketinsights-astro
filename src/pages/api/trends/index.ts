export const prerender = false;
import { calculateSummaryStats, generateInsightSummary, SIMULATED_TREND_DATA } from '@utils/trendEngine';
import { getTrendingProductsByCategory } from '@utils/dataSources';

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category') || '';
  const timeframe = (url.searchParams.get('timeframe') as '7d' | '30d') || '30d';

  let products = [];
  try {
    // Attempt real data fetch
    products = await getTrendingProductsByCategory(category);

    // If real data is too sparse, supplement or replace with high-quality simulation
    if (products.length < 3) {
      products = SIMULATED_TREND_DATA.filter(p => !category || p.category === category);
    }
  } catch (error) {
    console.warn('API Fetch failed, falling back to Simulation Mode');
    products = SIMULATED_TREND_DATA.filter(p => !category || p.category === category);
  }

  const stats = calculateSummaryStats(products);
  const insight = generateInsightSummary(stats.topCategory);

  const response = {
    success: true,
    data: {
      products,
      stats,
      insight,
      meta: {
        category: category || 'All Categories',
        timeframe,
        timestamp: new Date().toISOString(),
        totalProducts: products.length,
      },
    },
  };

  // Set CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  return new Response(JSON.stringify(response), { headers });
}

// Handle CORS preflight
export async function OPTIONS() {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  return new Response(null, { status: 204, headers });
}

export default {
  GET,
  OPTIONS,
};

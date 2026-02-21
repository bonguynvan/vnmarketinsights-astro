import { getTrendingProducts } from './src/utils/dataSources.ts';

async function test() {
  console.log('Fetching trending products...');
  try {
    const products = await getTrendingProducts();
    console.log(`Found ${products.length} products.`);
    if (products.length > 0) {
      console.log('First product sample:', JSON.stringify(products[0], null, 2));
      const sources = [...new Set(products.map(p => p.source))];
      console.log('Sources found:', sources);
    } else {
      console.log('No products found!');
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();

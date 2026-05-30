import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';
import tsconfigPaths from 'vite-tsconfig-paths';

// Insight article filenames were renamed to drop the leading NN- prefix
// so URLs become /insights/ecommerce-vietnam/ instead of /insights/02-ecommerce-vietnam/.
// These redirects keep any pre-existing inbound links working.
const insightRedirects = Object.fromEntries(
  [
    ['01-digital-economy-overview',     'digital-economy-overview'],
    ['02-ecommerce-vietnam',            'ecommerce-vietnam'],
    ['03-fintech-landscape',            'fintech-landscape'],
    ['04-logistics-last-mile',          'logistics-last-mile'],
    ['05-consumer-internet-penetration','consumer-internet-penetration'],
    ['06-sme-landscape',                'sme-landscape'],
    ['07-retail-vs-traditional-trade',  'retail-vs-traditional-trade'],
    ['08-mobile-first-behavior',        'mobile-first-behavior'],
    ['09-digital-payments',             'digital-payments'],
    ['10-social-live-commerce',         'social-live-commerce'],
    ['11-cross-border-ecommerce',       'cross-border-ecommerce'],
    ['12-regulatory-environment',       'regulatory-environment'],
    ['13-vietnam-stock-market-overview','vietnam-stock-market-overview'],
    ['14-vn30-index-intro',             'vn30-index-intro'],
  ].map(([from, to]) => [`/insights/${from}`, `/insights/${to}`])
);

export default defineConfig({
  site: 'https://vnmarketinsights.com',
  output: 'hybrid',
  adapter: vercel(),
  integrations: [tailwind()],
  redirects: insightRedirects,
  vite: {
    plugins: [tsconfigPaths()],
    resolve: {
      preservesSymlinks: true,
    },
  },
});

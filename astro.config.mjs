import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  site: 'https://vnmarketinsights.com',
  output: 'hybrid',
  adapter: vercel(),
  integrations: [tailwind()],
  vite: {
    plugins: [tsconfigPaths()],
    resolve: {
      preservesSymlinks: true,
    },
  },
});

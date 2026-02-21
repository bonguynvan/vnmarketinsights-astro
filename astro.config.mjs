import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  site: 'https://vnmarketinsights.com',
  integrations: [tailwind()],
  vite: {
    plugins: [tsconfigPaths()],
    resolve: {
      preservesSymlinks: true,
    },
  },
});

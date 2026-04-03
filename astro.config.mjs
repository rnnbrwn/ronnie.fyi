// @ts-check
import { defineConfig } from 'astro/config';
import remarkYouTube from './src/plugins/remark-youtube.mjs';
import rehypeRaw from 'rehype-raw';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://ronnie.fyi',
  trailingSlash: 'never',

  markdown: {
      remarkPlugins: [remarkYouTube],
      rehypePlugins: [rehypeRaw],
    },

  integrations: [sitemap()],
});
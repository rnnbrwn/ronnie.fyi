// @ts-check
import { defineConfig } from 'astro/config';
import remarkYouTube from './src/plugins/remark-youtube.mjs';
import rehypeRaw from 'rehype-raw';

import sitemap from '@astrojs/sitemap';

/** @type {import('vite').Plugin} */
const redirectTrailingSlash = {
  name: 'redirect-trailing-slash',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && req.url !== '/' && req.url.endsWith('/')) {
        const target = req.url.slice(0, -1);
        res.writeHead(301, { Location: target });
        res.end();
        return;
      }
      next();
    });
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://ronnie.fyi',
  trailingSlash: 'never',

  markdown: {
      remarkPlugins: [remarkYouTube],
      rehypePlugins: [rehypeRaw],
    },

  integrations: [sitemap()],

  vite: {
    plugins: [redirectTrailingSlash],
  },


});
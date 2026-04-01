// @ts-check
import { defineConfig } from 'astro/config';
import remarkYouTube from './src/plugins/remark-youtube.mjs';
import rehypeRaw from 'rehype-raw';

// https://astro.build/config
export default defineConfig({
  site: 'https://ronnie.fyi',
  trailingSlash: 'never',
  markdown: {
      remarkPlugins: [remarkYouTube],
      rehypePlugins: [rehypeRaw],
	},
});
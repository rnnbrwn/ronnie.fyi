// @ts-check
import { defineConfig } from 'astro/config';
import remarkYouTube from './src/plugins/remark-youtube.mjs';

// https://astro.build/config
export default defineConfig({
	markdown: {
		remarkPlugins: [remarkYouTube],
	},
});

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ pattern: '**/[^_]*.md', base: './src/data/blog' }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		description: z.string(),
		author: z.string(),
		image: z
			.object({
				url: z.string(),
				alt: z.string(),
				source: z.string().optional(),
			})
			.optional(),
		tags: z.array(z.string()),
		pinned: z.boolean().default(false),
		stale: z.boolean().default(false),
	}),
});

export const collections = { blog };

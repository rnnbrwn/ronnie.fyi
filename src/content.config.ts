import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ pattern: import.meta.env.DEV ? ['**/*.md', '!**/_template.md'] : '**/[^_]*.md', base: './src/data/blog' }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		description: z.string(),
		image: z
			.object({
				url: z.string(),
				alt: z.string(),
				source: z.string().optional(),
			})
			.optional(),
		tags: z.array(z.string()),
		pinned: z.boolean().default(false),
		pinnedFrom: z.coerce.date().optional(),
		pinnedUntil: z.coerce.date().optional(),
		stale: z.boolean().default(false),
		postToBsky: z.boolean().optional(),
		bskyPostUri: z.string().optional(),
		hardcoverIds: z.number().array().optional(),
	}),
});

const notes = defineCollection({
	loader: glob({ pattern: '**/[^_]*.md', base: './src/data/notes' }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		description: z.string(),
	}),
});

export const collections = { blog, notes };

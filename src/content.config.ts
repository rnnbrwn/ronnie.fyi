import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';
import { wordpressPosts } from './loaders/wordpress-posts';

const blog = defineCollection({
	loader: wordpressPosts(),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		publishedAt: z.coerce.date().optional(),
		description: z.string(),
		image: z
			.object({
				url: z.string(),
				alt: z.string(),
				source: z.string().optional(),
				width: z.number().optional(),
				height: z.number().optional(),
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
		draft: z.boolean().default(false),
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

const shelfEvents = defineCollection({
	loader: glob({ pattern: '**/[^_]*.md', base: './src/data/shelf-events' }),
	schema: z.object({
		title: z.string(),
		pubDate: z.coerce.date(),
		bookTitle: z.string(),
		bookSlug: z.string().optional(),
		rating: z.number().min(0).max(5).optional(),
		review: z.string().optional(),
	}),
});

export const collections = { blog, notes, 'shelf-events': shelfEvents };

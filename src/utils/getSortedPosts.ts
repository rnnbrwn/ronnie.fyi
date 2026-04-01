import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type BlogPost = { collection: 'blog'; entry: CollectionEntry<'blog'> };
export type NotePost = { collection: 'notes'; entry: CollectionEntry<'notes'> };
export type AnyPost = BlogPost | NotePost;

export async function getSortedPosts(): Promise<AnyPost[]> {
	const now = new Date();

	const blogPosts = (await getCollection('blog'))
		.filter((p) => new Date(p.data.pubDate) <= now)
		.map((entry): BlogPost => ({ collection: 'blog', entry }));

	const notePosts = (await getCollection('notes'))
		.filter((p) => new Date(p.data.pubDate) <= now)
		.map((entry): NotePost => ({ collection: 'notes', entry }));

	return [...blogPosts, ...notePosts].sort(
		(a, b) => new Date(b.entry.data.pubDate).valueOf() - new Date(a.entry.data.pubDate).valueOf()
	);
}

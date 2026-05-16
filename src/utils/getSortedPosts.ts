import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export function formatDate(date: Date): string {
	return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatMonthYear(date: Date): string {
	return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function formatRelativeDate(date: Date): string {
	const now = new Date();
	const diffMs = now.valueOf() - date.valueOf();
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

	if (diffHours < 24) {
		return diffHours <= 1 ? '1 hour ago' : `${diffHours} hours ago`;
	}

	const diffDays = Math.floor(diffHours / 24);
	return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

export function formatDateShort(date: Date): string {
	return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatShelfEventDate(date: Date): string {
	const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
	const day = date.getDate();
	const month = date.toLocaleDateString('en-GB', { month: 'short' });
	return `${weekday} ${day} ${month}`.toUpperCase();
}

export function getPostUrl(pubDate: Date, id: string): string {
	const year = pubDate.getFullYear();
	const month = String(pubDate.getMonth() + 1).padStart(2, '0');
	return `/${year}/${month}/${id}`;
}

export function isEffectivelyPinned(data: CollectionEntry<'blog'>['data'], now: Date = new Date()): boolean {
	if (!data.pinned) return false;
	if (data.pinnedFrom && now < data.pinnedFrom) return false;
	if (data.pinnedUntil && now > data.pinnedUntil) return false;
	return true;
}

export type BlogPost = { collection: 'blog'; entry: CollectionEntry<'blog'> };
export type NotePost = { collection: 'notes'; entry: CollectionEntry<'notes'> };
export type ShelfEventPost = { collection: 'shelf-events'; entry: CollectionEntry<'shelf-events'> };
export type AnyPost = BlogPost | NotePost | ShelfEventPost;

export function isDraft(id: string): boolean {
	return id.startsWith('_');
}

export async function getSortedPosts(): Promise<AnyPost[]> {
	const now = new Date();

	const blogPosts = (await getCollection('blog'))
		.filter((p) => import.meta.env.DEV || new Date(p.data.pubDate) <= now)
		.map((entry): BlogPost => ({ collection: 'blog', entry }));

	const notePosts = (await getCollection('notes'))
		.filter((p) => new Date(p.data.pubDate) <= now)
		.map((entry): NotePost => ({ collection: 'notes', entry }));

	const shelfEventPosts = (await getCollection('shelf-events'))
		.filter((p) => new Date(p.data.pubDate) <= now)
		.map((entry): ShelfEventPost => ({ collection: 'shelf-events', entry }));

	return [...blogPosts, ...notePosts, ...shelfEventPosts].sort(
		(a, b) => new Date(b.entry.data.pubDate).valueOf() - new Date(a.entry.data.pubDate).valueOf()
	);
}

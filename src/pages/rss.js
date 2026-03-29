import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
	const posts = await getCollection('blog');
	const sorted = posts.sort((a, b) => b.data.pubDate - a.data.pubDate);

	return rss({
		title: 'ronnie.fyi',
		description: 'Writing about music, technology, and whatever else.',
		site: context.site,
		items: sorted.map((post) => ({
			title: post.data.title,
			pubDate: post.data.pubDate,
			description: post.data.description,
			link: `/posts/${post.id}/`,
		})),
	});
}

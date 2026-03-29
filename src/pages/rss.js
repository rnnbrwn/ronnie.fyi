import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
	const posts = await getCollection('blog');
	const sorted = posts.sort((a, b) => b.data.pubDate - a.data.pubDate);

	return rss({
		title: 'ronnie.fyi',
		description: 'Writing about music, technology, and whatever else.',
		site: context.site,
		xmlns: {
			media: 'http://search.yahoo.com/mrss/',
		},
		items: sorted.map((post) => {
			const imageUrl = post.data.image
				? new URL(post.data.image.url, context.site).href
				: null;

			return {
				title: post.data.title,
				pubDate: post.data.pubDate,
				description: post.data.description,
				link: `/posts/${post.id}/`,
				customData: imageUrl
					? `<media:content url="${imageUrl}" medium="image" />`
					: '',
			};
		}),
	});
}

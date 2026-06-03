import rss from '@astrojs/rss';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

const imageFiles = import.meta.glob('/src/assets/images/*', { eager: true });

export async function GET(context) { // Astro API route that generates the RSS feed with full post content and feature images
	const now = new Date();
	const posts = await getCollection('blog', ({ data }) => new Date(data.pubDate) <= now);
	const sorted = posts.sort((a, b) => b.data.pubDate - a.data.pubDate);

	const container = await AstroContainer.create();

	const items = await Promise.all(
		sorted.map(async (post) => {
			const { Content } = await render(post);
			const html = await container.renderToString(Content);

			const imageModule = post.data.image
				? imageFiles[`/src/assets/images/${post.data.image.url}`]
				: null;
			const imageUrl = imageModule
				? new URL(imageModule.default.src, context.site).href
				: null;

			const imageHtml = imageUrl
				? `<img src="${imageUrl}" alt="${post.data.image.alt}" />`
				: '';

			return {
				title: post.data.title,
				pubDate: post.data.pubDate,
				description: post.data.description,
				link: `/posts/${post.id}/`,
				content: imageHtml + html,
				customData: imageUrl
					? `<media:content url="${imageUrl}" medium="image" /><media:thumbnail url="${imageUrl}" />`
					: '',
			};
		})
	);

	return rss({
		title: 'ronnie.fyi',
		description: 'Writing about music, technology, and whatever else.',
		site: context.site,
		xmlns: {
			media: 'http://search.yahoo.com/mrss/',
		},
		items,
	});
}

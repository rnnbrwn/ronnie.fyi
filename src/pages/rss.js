import rss from '@astrojs/rss';
import { getCollection, render } from 'astro:content';
import { getImage } from 'astro:assets';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { isPublished } from '../utils/getSortedPosts';


export async function GET(context) { // Astro API route that generates the RSS feed with full post content and feature images
	const now = new Date();
	const posts = await getCollection('blog', ({ data }) => isPublished(data, now));
	const sorted = posts.sort((a, b) => b.data.pubDate - a.data.pubDate);

	const container = await AstroContainer.create();

	const items = await Promise.all(
		sorted.map(async (post) => {
			const { Content } = await render(post);
			const html = await container.renderToString(Content);

			const image = post.data.image
				? await getImage({ src: post.data.image.url, width: post.data.image.width, height: post.data.image.height, inferSize: !(post.data.image.width && post.data.image.height) })
				: null;
			const imageUrl = image ? new URL(image.src, context.site).href : null;

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

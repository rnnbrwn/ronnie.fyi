import type { Loader } from 'astro/loaders';
import { fetchGraphQLStrict, WORDPRESS_API_URL, WORDPRESS_CMS_URL } from '../utils/wordpress';

const POSTS_QUERY = `
	query BlogPosts($after: String, $stati: [PostStatusEnum]) {
		posts(first: 100, after: $after, where: { stati: $stati }) {
			pageInfo { hasNextPage endCursor }
			nodes {
				databaseId
				slug
				title
				status
				date
				dateGmt
				excerpt
				content
				tags(first: 100) { nodes { name } }
				featuredImage { node { sourceUrl altText mediaDetails { width height } } }
				blogPostMeta { imageAlt imageSource pinned pinnedFrom pinnedUntil stale postToBsky bskyPostUri hardcoverIds }
			}
		}
	}
`;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };

function decodeEntities(text: string): string { // decodes the numeric and common named HTML entities WordPress emits in titles and excerpts
	return text
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
		.replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

function stripTags(html: string): string { // reduces an HTML fragment (e.g. an excerpt) to plain text
	return decodeEntities(html.replace(/<[^>]+>/g, '')).trim();
}

function escapeRegExp(text: string): string { // escapes a string for literal use inside a RegExp
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rewriteLinks(html: string): string { // turns links to the CMS into site-relative links; images and other media keep their absolute CMS URLs
	const cms = escapeRegExp(WORDPRESS_CMS_URL);
	return html
		.replace(new RegExp(`href="${cms}/(\\d{4})/(\\d{2})/\\d{2}/([^/"#?]+)/?([?#][^"]*)?"`, 'g'), (_, y, m, slug, tail = '') => `href="/${y}/${m}/${slug}${tail}"`) // WordPress permalinks -> /year/month/slug
		.replace(new RegExp(`href="${cms}(/(?!wp-content/)[^"]*)"`, 'g'), (_, path: string) => `href="${path.length > 1 ? path.replace(/\/(?=$|[?#])/, '') : path}"`);
}

function youTubeEmbed(id: string): string { // the privacy-friendly embed markup the site styles via .youtube-embed
	return `<div class="youtube-embed"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" style="aspect-ratio: 16/9; width: 100%; height: auto;"></iframe></div>`;
}

function convertYouTubeEmbeds(html: string): string { // swaps WordPress' YouTube embed blocks, whether already an iframe or still a bare URL, for the site's .youtube-embed markup
	const block = /<figure class="wp-block-embed[^"]*">\s*<div class="wp-block-embed__wrapper">\s*(.*?)\s*<\/div>\s*<\/figure>/gs;
	return html.replace(block, (whole, inner: string) => {
		const id = inner.match(/youtube\.com\/embed\/([\w-]+)/)?.[1] ?? inner.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)?.[1];
		return id ? youTubeEmbed(id) : whole;
	});
}

function parseHardcoverIds(value?: string | null): number[] | undefined { // parses the comma-separated Hardcover IDs field into numbers
	const ids = (value ?? '').split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0);
	return ids.length ? ids : undefined;
}

function optionalDate(value?: string | null): string | undefined { // passes through a date string, or undefined when the field is empty
	return value ? value : undefined;
}

type WpPost = {
	databaseId: number;
	slug: string;
	title: string;
	status: string;
	date: string;
	dateGmt: string;
	excerpt: string;
	content: string;
	tags: { nodes: { name: string }[] };
	featuredImage: { node: { sourceUrl: string; altText: string | null; mediaDetails: { width: number; height: number } | null } } | null;
	blogPostMeta: {
		imageAlt: string | null;
		imageSource: string | null;
		pinned: boolean | null;
		pinnedFrom: string | null;
		pinnedUntil: string | null;
		stale: boolean | null;
		postToBsky: boolean | null;
		bskyPostUri: string | null;
		hardcoverIds: string | null;
	} | null;
};

export function wordpressPosts(): Loader { // Astro content loader that reads blog posts from WordPress via WPGraphQL, shaped like the old Markdown entries
	return {
		name: 'wordpress-posts',
		load: async ({ store, parseData, generateDigest, logger }) => {
			const includeUnpublished = import.meta.env.DEV && /^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(WORDPRESS_API_URL); // dev against the local CMS only: its /graphql runs as admin (see rnnbrwn-cms/local-mu-plugins), so drafts and scheduled posts show up
			const stati = includeUnpublished ? ['PUBLISH', 'FUTURE', 'DRAFT', 'PENDING', 'PRIVATE'] : ['PUBLISH'];

			const posts: WpPost[] = [];
			let after: string | null = null;
			do {
				const data = await fetchGraphQLStrict(POSTS_QUERY, { after, stati });
				posts.push(...data.posts.nodes);
				after = data.posts.pageInfo.hasNextPage ? data.posts.pageInfo.endCursor : null;
			} while (after);

			if (posts.length === 0) throw new Error('WordPress returned 0 blog posts; refusing to build an empty site');

			store.clear();
			for (const post of posts) {
				const meta = post.blogPostMeta;
				const image = post.featuredImage?.node;
				const id = post.slug || `draft-${post.databaseId}`;
				const data = await parseData({
					id,
					data: {
						title: decodeEntities(post.title),
						pubDate: post.date, // WordPress' local time, parsed in the runtime's timezone exactly as the old frontmatter dates were, so post URLs stay the same
						publishedAt: optionalDate(post.dateGmt ? `${post.dateGmt}Z` : null), // the real publish instant (WordPress stores it in UTC as dateGmt); null for a post that's never been published (draft/pending), which only ever shows up in dev. Only used to decide whether a post is live yet, never for URLs or display
						description: stripTags(post.excerpt),
						tags: post.tags.nodes.map((t) => t.name),
						image: image
							? {
									url: image.sourceUrl,
									alt: meta?.imageAlt || image.altText || '',
									source: meta?.imageSource || undefined,
									width: image.mediaDetails?.width,
									height: image.mediaDetails?.height,
							  }
							: undefined,
						pinned: meta?.pinned ?? false,
						pinnedFrom: optionalDate(meta?.pinnedFrom),
						pinnedUntil: optionalDate(meta?.pinnedUntil),
						stale: meta?.stale ?? false,
						postToBsky: meta?.postToBsky || undefined,
						bskyPostUri: meta?.bskyPostUri || undefined,
						hardcoverIds: parseHardcoverIds(meta?.hardcoverIds),
						draft: post.status === 'draft' || post.status === 'pending',
					},
				});
				const html = convertYouTubeEmbeds(rewriteLinks(post.content));
				store.set({ id, data, rendered: { html }, digest: generateDigest({ data, html }) });
			}
			logger.info(`Loaded ${posts.length} posts from WordPress${includeUnpublished ? ' (dev: including drafts and scheduled)' : ''}`);
		},
	};
}

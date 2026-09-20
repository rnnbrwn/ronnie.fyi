const API_URL = process.env.WORDPRESS_API_URL ?? 'https://cms.ronnie.fyi/graphql';
const REST_URL = API_URL.replace(/\/graphql\/?$/, '/wp-json');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };

/**
 * Decode the numeric and common named HTML entities WordPress emits in titles and excerpts.
 * @param {string} text
 */
export function decodeEntities(text) {
	return text
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
		.replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/**
 * Reduce an HTML fragment (e.g. an excerpt) to plain text.
 * @param {string} html
 */
export function stripTags(html) {
	return decodeEntities(html.replace(/<[^>]+>/g, '')).trim();
}

/**
 * Run a WPGraphQL query. Throws on any failure.
 * @param {string} query
 * @param {Record<string, unknown>} [variables]
 */
export async function fetchGraphQL(query, variables = {}) {
	const res = await fetch(API_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ query, variables }),
	});
	if (!res.ok) throw new Error(`WordPress GraphQL request failed: ${res.status} ${res.statusText}`);
	const json = await res.json();
	if (json.errors?.length) throw new Error(`WordPress GraphQL errors: ${json.errors.map((e) => e.message).join('; ')}`);
	return json.data;
}

/**
 * Update a post's Blog Post Meta (ACF) fields through the WordPress REST API.
 * Needs WP_APP_USER and WP_APP_PASSWORD (a WordPress Application Password).
 * @param {number} postId
 * @param {Record<string, unknown>} fields ACF field names, e.g. { bsky_post_uri: '…', post_to_bsky: false }
 */
export async function updatePostMeta(postId, fields) {
	const user = process.env.WP_APP_USER;
	const password = process.env.WP_APP_PASSWORD;
	if (!user || !password) throw new Error('Missing WP_APP_USER or WP_APP_PASSWORD');
	const res = await fetch(`${REST_URL}/wp/v2/posts/${postId}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
		},
		body: JSON.stringify({ acf: fields }),
	});
	if (!res.ok) throw new Error(`WordPress REST update of post ${postId} failed: ${res.status} ${await res.text()}`);
	return res.json();
}

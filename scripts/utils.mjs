export const BASE_URL = 'https://ronnie.fyi';

/**
 * Parse YAML-like frontmatter from a markdown file's string content.
 * Returns a flat object of string values.
 * @param {string} content
 * @returns {Record<string, string>}
 */
export function parseFrontmatter(content) {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};
	const result = {};
	for (const line of match[1].split('\n')) {
		const colonIdx = line.indexOf(':');
		if (colonIdx === -1) continue;
		const key = line.slice(0, colonIdx).trim();
		const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
		result[key] = value;
	}
	return result;
}

/**
 * Format a date as "1 January 2025"
 * @param {Date | string} date
 */
export function formatDate(date) {
	return new Date(date).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
}

/**
 * Build a post URL path: /year/month/slug
 * @param {Date | string} pubDate
 * @param {string} slug
 * @param {{ absolute?: boolean, trailingSlash?: boolean }} [opts]
 */
export function getPostUrl(pubDate, slug, { absolute = false, trailingSlash = false } = {}) {
	const d = new Date(pubDate);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const path = `/${year}/${month}/${slug}${trailingSlash ? '/' : ''}`;
	return absolute ? `${BASE_URL}${path}` : path;
}

// Small helpers for working with the raw HTML WordPress returns, shared by the
// blog-post loader and anything else that needs to read WordPress-authored HTML
// (e.g. reducing a figcaption to plain text).

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };

export function decodeEntities(text: string): string { // decodes the numeric and common named HTML entities WordPress emits in titles and excerpts
	return text
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
		.replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

export function stripTags(html: string): string { // reduces an HTML fragment (e.g. an excerpt or figcaption) to plain text
	return decodeEntities(html.replace(/<[^>]+>/g, '')).trim();
}

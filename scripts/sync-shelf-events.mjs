import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHELF_EVENTS_DIR = join(__dirname, '..', 'src', 'data', 'shelf-events');
const HARDCOVER_API_URL = 'https://api.hardcover.app/v1/graphql';

function yamlStr(value) {
	if (value.includes("'")) return `'${value.replace(/'/g, "''")}'`;
	return `'${value}'`;
}

function formatDate(dateStr) {
	if (!dateStr) return new Date().toISOString().split('T')[0];
	return dateStr.split('T')[0];
}

function getExistingBookSlugs() {
	const slugs = new Set();
	for (const file of readdirSync(SHELF_EVENTS_DIR)) {
		if (!file.endsWith('.md')) continue;
		const content = readFileSync(join(SHELF_EVENTS_DIR, file), 'utf-8');
		const fm = parseFrontmatter(content);
		if (fm.bookSlug) slugs.add(fm.bookSlug);
	}
	return slugs;
}

const LOOKBACK_DAYS = 30;

async function fetchReadBooks() {
	const token = process.env.HARDCOVER_API_TOKEN;
	if (!token) throw new Error('HARDCOVER_API_TOKEN is not set');

	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);
	const cutoffStr = cutoff.toISOString().split('T')[0];

	const res = await fetch(HARDCOVER_API_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', authorization: token },
		body: JSON.stringify({
			query: `
				query GetReadBooks {
					me {
						user_books(where: {
							status_id: { _eq: 3 },
							user_book_reads: { finished_at: { _gte: "${cutoffStr}" } }
						}) {
							rating
							user_book_reads(order_by: { finished_at: desc_nulls_last }, limit: 1) {
								finished_at
							}
							book {
								title
								slug
							}
						}
					}
				}
			`,
		}),
	});

	if (!res.ok) throw new Error(`Hardcover API error: ${res.status}`);
	const { data } = await res.json();
	return data?.me?.[0]?.user_books ?? [];
}

async function main() {
	const existingSlugs = getExistingBookSlugs();
	const readBooks = await fetchReadBooks();

	let created = 0;
	for (const ub of readBooks) {
		const { title, slug } = ub.book;
		if (!slug || existingSlugs.has(slug)) continue;

		const finishedAt = ub.user_book_reads[0]?.finished_at ?? null;
		const pubDate = formatDate(finishedAt);
		const rating = ub.rating != null ? Math.round(ub.rating) : null;

		const lines = [
			'---',
			`title: ${yamlStr(`Finished: ${title}`)}`,
			`pubDate: ${pubDate}`,
			`bookTitle: ${yamlStr(title)}`,
			`bookSlug: ${yamlStr(slug)}`,
		];
		if (rating !== null) lines.push(`rating: ${rating}`);
		lines.push('---', '');

		const filename = `${slug}-finished.md`;
		writeFileSync(join(SHELF_EVENTS_DIR, filename), lines.join('\n'), 'utf-8');
		console.log(`Created: ${filename}`);
		created++;
	}

	if (created === 0) {
		console.log('No new shelf events to create.');
	} else {
		console.log(`Created ${created} shelf event(s).`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

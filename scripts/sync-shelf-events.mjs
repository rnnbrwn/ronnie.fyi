import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHELF_EVENTS_DIR = join(__dirname, '..', 'src', 'data', 'shelf-events');
const HARDCOVER_API_URL = 'https://api.hardcover.app/v1/graphql';

function yamlStr(value) { // safely wraps a string value in YAML single quotes, escaping any existing single quotes
	if (value.includes("'")) return `'${value.replace(/'/g, "''")}'`;
	return `'${value}'`;
}

function stripHtml(html) { // strips HTML tags and decodes common HTML entities to plain text
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.trim();
}

function formatDate(dateStr) { // extracts the YYYY-MM-DD date portion from an ISO string, defaulting to today
	if (!dateStr) return new Date().toISOString().split('T')[0];
	return dateStr.split('T')[0];
}

function getExistingFiles() { // reads all shelf-event .md files and returns a Map of bookSlug → {filepath, review}
	const files = new Map(); // slug → { filepath, review }
	for (const file of readdirSync(SHELF_EVENTS_DIR)) {
		if (!file.endsWith('.md')) continue;
		const filepath = join(SHELF_EVENTS_DIR, file);
		const content = readFileSync(filepath, 'utf-8');
		const fm = parseFrontmatter(content);
		if (fm.bookSlug) files.set(fm.bookSlug, { filepath, review: fm.review ?? null });
	}
	return files;
}

function updateReviewInFile(filepath, review) { // updates or inserts the review field in a shelf event file's frontmatter
	let content = readFileSync(filepath, 'utf-8');
	const reviewLine = `review: ${yamlStr(review)}`;
	if (/^review:/m.test(content)) {
		content = content.replace(/^review:.*$/m, reviewLine);
	} else {
		// Insert before the closing --- (opening --- is at position 0, not preceded by \n)
		content = content.replace(/(\n)---(\n|$)/, `\n${reviewLine}\n---$2`);
	}
	writeFileSync(filepath, content, 'utf-8');
}

const LOOKBACK_DAYS = 30;

async function fetchReadBooks() { // queries the Hardcover API for books marked as read within the lookback window
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
							review
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

async function main() { // syncs recently-read Hardcover books to local shelf-event .md files, creating new ones or updating reviews
	const existingFiles = getExistingFiles();
	const readBooks = await fetchReadBooks();

	let created = 0;
	let updated = 0;

	for (const ub of readBooks) {
		const { title, slug } = ub.book;
		if (!slug) continue;

		const review = ub.review ? stripHtml(ub.review) : null;

		if (existingFiles.has(slug)) {
			const { filepath, review: existingReview } = existingFiles.get(slug);
			if (review && review !== existingReview) {
				updateReviewInFile(filepath, review);
				console.log(`Updated review: ${slug}`);
				updated++;
			}
			continue;
		}

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
		if (review) lines.push(`review: ${yamlStr(review)}`);
		lines.push('---', '');

		const filename = `${slug}-finished.md`;
		writeFileSync(join(SHELF_EVENTS_DIR, filename), lines.join('\n'), 'utf-8');
		console.log(`Created: ${filename}`);
		created++;
	}

	if (created === 0 && updated === 0) {
		console.log('No changes.');
	} else {
		if (created) console.log(`Created ${created} shelf event(s).`);
		if (updated) console.log(`Updated ${updated} shelf event(s).`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

#!/usr/bin/env node
// Usage: node --env-file=.env scripts/hardcover-id.mjs <search-term>
// Example: node --env-file=.env scripts/hardcover-id.mjs muybridge

const term = process.argv[2]?.toLowerCase();

if (!term) {
	console.error('Usage: node --env-file=.env scripts/hardcover-id.mjs <search-term>');
	process.exit(1);
}

const token = process.env.HARDCOVER_API_TOKEN;
if (!token) {
	console.error('HARDCOVER_API_TOKEN is not set in .env');
	process.exit(1);
}

const res = await fetch('https://api.hardcover.app/v1/graphql', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json', authorization: token },
	body: JSON.stringify({
		query: `query {
			me {
				user_books(where: { status_id: { _in: [2, 3] } }) {
					book {
						id
						title
						slug
					}
				}
			}
		}`,
	}),
});

const { data } = await res.json();
const userBooks = data?.me?.[0]?.user_books ?? [];

const matches = userBooks.filter(
	({ book }) =>
		book.slug.toLowerCase().includes(term) ||
		book.title.toLowerCase().includes(term)
);

if (matches.length === 0) {
	console.error(`No book found matching: ${term}`);
	process.exit(1);
}

for (const { book } of matches) {
	console.log(`\n${book.title}`);
	console.log(`hardcoverId: ${book.id}`);
}

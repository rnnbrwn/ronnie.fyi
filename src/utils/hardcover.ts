const HARDCOVER_API_URL = 'https://api.hardcover.app/v1/graphql';

interface HardcoverAuthor {
	name: string;
}

interface HardcoverBook {
	id: number;
	title: string;
	slug: string;
	image: { url: string } | null;
	contributions: { author: HardcoverAuthor }[];
	book_series: { position: number | null; series: { name: string } }[];
}

export interface UserBook {
	status_id: number;
	rating: number | null;
	user_book_reads: { finished_at: string | null }[];
	book: HardcoverBook;
}

export interface ShelfData {
	currentlyReading: UserBook[];
	readByYear: Map<number, UserBook[]>;
}

async function fetchGraphQL(query: string, variables = {}): Promise<any> {
	const token = import.meta.env.HARDCOVER_API_TOKEN;
	try {
		const response = await fetch(HARDCOVER_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(token ? { authorization: token } : {}),
			},
			body: JSON.stringify({ query, variables }),
		});
		const { data } = await response.json();
		return data;
	} catch (err) {
		console.warn(`Hardcover fetch failed: ${err}`);
		return null;
	}
}

export async function getShelf(): Promise<ShelfData> {
	const data = await fetchGraphQL(`
		query GetShelf {
			me {
				user_books(where: { status_id: { _in: [2, 3] } }) {
					status_id
					rating
					user_book_reads(order_by: { finished_at: desc_nulls_last }, limit: 1) {
						finished_at
					}
					book {
						id
						title
						slug
						image {
							url
						}
						contributions {
							author {
								name
							}
						}
						book_series {
							position
							series {
								name
							}
						}
					}
				}
			}
		}
	`);

	const userBooks: UserBook[] = data?.me?.[0]?.user_books ?? [];

	const currentlyReading = userBooks.filter((ub) => ub.status_id === 2);

	// Sort read books by finished_at descending before grouping
	const readBooks = userBooks
		.filter((ub) => ub.status_id === 3)
		.sort((a, b) => {
			const aDate = a.user_book_reads[0]?.finished_at ?? '';
			const bDate = b.user_book_reads[0]?.finished_at ?? '';
			return bDate.localeCompare(aDate);
		});

	const readByYear = new Map<number, UserBook[]>();
	for (const ub of readBooks) {
		const finishedAt = ub.user_book_reads[0]?.finished_at ?? null;
		const year = finishedAt ? new Date(finishedAt).getFullYear() : 0;
		if (!readByYear.has(year)) readByYear.set(year, []);
		readByYear.get(year)!.push(ub);
	}

	// Sort years descending
	const sorted = new Map([...readByYear.entries()].sort((a, b) => b[0] - a[0]));

	return { currentlyReading, readByYear: sorted };
}

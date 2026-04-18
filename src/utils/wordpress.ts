const WORDPRESS_API_URL = import.meta.env.WORDPRESS_API_URL ?? 'https://cms.ronnie.fyi/graphql';

async function fetchGraphQL(query: string, variables = {}) {
	try {
		const response = await fetch(WORDPRESS_API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query, variables }),
		});
		const { data } = await response.json();
		return data;
	} catch (err) {
		console.warn(`WordPress fetch failed: ${err}`);
		return null;
	}
}

export async function getPage(slug: string) {
	const data = await fetchGraphQL(
		`query GetPage($slug: ID!) {
			page(id: $slug, idType: URI) {
				title
				content
			}
		}`,
		{ slug }
	);
	return data?.page ?? null;
}

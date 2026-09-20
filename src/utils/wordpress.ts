export const WORDPRESS_API_URL = import.meta.env.WORDPRESS_API_URL ?? 'https://cms.ronnie.fyi/graphql';
export const WORDPRESS_CMS_URL = import.meta.env.WORDPRESS_CMS_URL ?? 'https://cms.ronnie.fyi';

function rewriteContentUrls(content: string): string { // strips the CMS origin from absolute URLs and removes trailing slashes from internal links
	return content
		.replaceAll(WORDPRESS_CMS_URL, '')
		.replace(/href="(\/[^"]*?)\/"/g, 'href="$1"');
}

async function fetchGraphQL(query: string, variables = {}) { // sends a GraphQL query to the WordPress API and returns the data payload
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

export async function fetchGraphQLStrict(query: string, variables = {}, headers: Record<string, string> = {}) { // like fetchGraphQL but throws on any failure, so a CMS outage fails the build instead of publishing an empty site
	const response = await fetch(WORDPRESS_API_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify({ query, variables }),
	});
	if (!response.ok) throw new Error(`WordPress GraphQL request failed: ${response.status} ${response.statusText}`);
	const json = await response.json();
	if (json.errors?.length) throw new Error(`WordPress GraphQL errors: ${json.errors.map((e: { message: string }) => e.message).join('; ')}`);
	if (!json.data) throw new Error('WordPress GraphQL returned no data');
	return json.data;
}

export async function getPage(slug: string) { // fetches a WordPress page by URI slug and rewrites its internal URLs to relative paths
	const data = await fetchGraphQL(
		`query GetPage($slug: ID!) {
			page(id: $slug, idType: URI) {
				title
				content
			}
		}`,
		{ slug }
	);
	const page = data?.page ?? null;
	if (page?.content) page.content = rewriteContentUrls(page.content);
	return page;
}

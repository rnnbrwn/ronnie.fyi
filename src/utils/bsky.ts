export interface BskyActor {
	did: string;
	handle: string;
	displayName?: string;
	avatar?: string;
}

export function bskyPostUrl(uri: string): string {
	const parts = uri.split('/');
	return `https://bsky.app/profile/${parts[2]}/post/${parts.at(-1)}`;
}

export async function fetchBskyInteractors(uri: string): Promise<BskyActor[]> {
	const encoded = encodeURIComponent(uri);
	const base = 'https://public.api.bsky.app/xrpc';
	const seen = new Set<string>();
	const interactors: BskyActor[] = [];

	try {
		const [likesRes, repostsRes] = await Promise.all([
			fetch(`${base}/app.bsky.feed.getLikes?uri=${encoded}&limit=100`),
			fetch(`${base}/app.bsky.feed.getRepostedBy?uri=${encoded}&limit=100`),
		]);

		if (likesRes.ok) {
			const data = await likesRes.json();
			for (const like of data.likes ?? []) {
				if (!seen.has(like.actor.did)) {
					seen.add(like.actor.did);
					interactors.push(like.actor);
				}
			}
		}
		if (repostsRes.ok) {
			const data = await repostsRes.json();
			for (const actor of data.repostedBy ?? []) {
				if (!seen.has(actor.did)) {
					seen.add(actor.did);
					interactors.push(actor);
				}
			}
		}
	} catch (err) {
		console.error(`[bsky] fetch failed for ${uri}:`, err);
	}

	return interactors;
}

import { loadEnv } from 'vite';

const QUERY = '{ posts(first: 100, where: { stati: [PUBLISH, FUTURE, DRAFT, PENDING, PRIVATE] }) { nodes { databaseId modifiedGmt status } } }';

export default function wordpressDevRefresh() { // dev only: re-syncs blog posts when the local WordPress changes, so edits made in wp-admin show up without restarting
	return {
		name: 'wordpress-dev-refresh',
		hooks: {
			'astro:server:setup': ({ refreshContent, logger }) => {
				const api = loadEnv('development', process.cwd(), '').WORDPRESS_API_URL;
				if (!api || !/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(api)) return; // only ever watches a local CMS

				let last;
				const timer = setInterval(async () => {
					try {
						const res = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: QUERY }) });
						const signature = JSON.stringify((await res.json()).data?.posts?.nodes);
						if (last !== undefined && signature !== last) {
							logger.info('WordPress changed, refreshing posts');
							await refreshContent({ loaders: ['wordpress-posts'] });
						}
						last = signature;
					} catch {
						// CMS not running or mid-restart: try again on the next tick
					}
				}, 3000);
				timer.unref();
			},
		},
	};
}

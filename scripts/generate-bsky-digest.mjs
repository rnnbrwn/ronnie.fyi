import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ACTOR = 'ronnie.fyi';
const __dirname = dirname(fileURLToPath(import.meta.url));

function uriToUrl(uri) {
	const rkey = uri.split('/').at(-1);
	return `https://bsky.app/profile/${ACTOR}/post/${rkey}`;
}

function formatDate(iso) {
	return new Date(iso).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
}

function formatDateTime(iso) {
	const d = new Date(iso);
	const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
	const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	return `${date} at ${time}`;
}

async function main() {
	const today = new Date();
	const todayStr = today.toISOString().slice(0, 10);

	const notesDir = join(__dirname, '..', 'src', 'data', 'notes');
	const outputPath = join(notesDir, `bsky-digest-${todayStr}.md`);

	if (existsSync(outputPath)) {
		console.log(`Digest for ${todayStr} already exists, skipping.`);
		process.exit(0);
	}

	const sevenDaysAgo = new Date(today);
	sevenDaysAgo.setDate(today.getDate() - 7);

	const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${ACTOR}&filter=posts_no_replies&limit=100`;
	const res = await fetch(url);

	if (!res.ok) {
		console.error(`API error: ${res.status} ${res.statusText}`);
		process.exit(1);
	}

	const data = await res.json();

	const recentPosts = data.feed
		.map((item) => item.post)
		.filter((post) => new Date(post.record.createdAt) >= sevenDaysAgo)
		.filter((post) => post.record.$type === 'app.bsky.feed.post')
		.sort((a, b) => new Date(b.record.createdAt) - new Date(a.record.createdAt));

	if (recentPosts.length === 0) {
		console.log('No posts in the last 7 days, skipping digest.');
		process.exit(0);
	}

	const startDate = formatDate(recentPosts[0].record.createdAt);
	const endDate = formatDate(recentPosts.at(-1).record.createdAt);
	const title = `Bluesky posts from the last week`;
	const description = `${recentPosts.length} post${recentPosts.length === 1 ? '' : 's'} from Bluesky this week.`;

	const sections = recentPosts.map((post) => {
		const postUrl = uriToUrl(post.uri);
		const dateTime = formatDateTime(post.record.createdAt);
		let content = `### Posted [${dateTime}](${postUrl})\n\n${post.record.text}`;

		if (post.embed?.$type === 'app.bsky.embed.images#view' && post.embed.images?.length) {
			const imgs = post.embed.images
				.map((img) => `![${img.alt || ''}](${img.thumb})`)
				.join('\n');
			content += `\n\n${imgs}`;
		}

		return content;
	});

	const body = sections.join('\n\n---\n\n');

	const markdown = `---
title: "${title}"
pubDate: ${todayStr}
description: "${description}"
---

${body}
`;

	mkdirSync(notesDir, { recursive: true });
	writeFileSync(outputPath, markdown, 'utf8');
	console.log(`Written: ${outputPath}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

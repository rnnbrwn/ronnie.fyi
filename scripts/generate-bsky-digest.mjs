import { existsSync, writeFileSync, mkdirSync, unlinkSync, readdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 15 * 60 * 1000;

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, attempt = 1) {
	try {
		const res = await fetch(url);
		return res;
	} catch (err) {
		if (attempt >= MAX_RETRIES) throw err;
		console.log(`Fetch failed (attempt ${attempt}/${MAX_RETRIES}): ${err.message}. Retrying in 15 minutes...`);
		await sleep(RETRY_DELAY_MS);
		return fetchWithRetry(url, attempt + 1);
	}
}

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

function formatShortDateTime(iso) {
	const d = new Date(iso);
	const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	return `${date} · ${time}`;
}

function applyFacets(text, facets) {
	if (!facets?.length) return text;
	const bytes = Buffer.from(text, 'utf8');
	const sorted = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);
	let result = '';
	let cursor = 0;
	for (const facet of sorted) {
		const { byteStart, byteEnd } = facet.index;
		const feature = facet.features?.[0];
		result += bytes.slice(cursor, byteStart).toString('utf8');
		const segment = bytes.slice(byteStart, byteEnd).toString('utf8');
		if (feature?.['$type'] === 'app.bsky.richtext.facet#link') {
			result += `<a href="${feature.uri}" target="_blank" rel="noopener noreferrer">${segment}</a>`;
		} else if (feature?.['$type'] === 'app.bsky.richtext.facet#mention') {
			result += `<a href="https://bsky.app/profile/${feature.did}" target="_blank" rel="noopener noreferrer">${segment}</a>`;
		} else {
			result += segment;
		}
		cursor = byteEnd;
	}
	result += bytes.slice(cursor).toString('utf8');
	return result;
}

function textToHtml(text) {
	return text
		.split('\n\n')
		.filter((p) => p.trim())
		.map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
		.join('\n');
}

async function main() {
	const today = new Date();
	const todayStr = today.toISOString().slice(0, 10);
	const pubDate = today.toISOString().slice(0, 16).replace('T', ' ');

	const notesDir = join(__dirname, '..', 'src', 'data', 'notes');
	const outputPath = join(notesDir, `bsky-digest-${todayStr}.md`);

	const existingDigests = readdirSync(notesDir).filter(
		(f) => f.match(/^bsky-digest-\d{4}-\d{2}-\d{2}\.md$/)
	);

	for (const file of existingDigests) {
		const oldPath = join(notesDir, file);
		const newPath = join(notesDir, `_${file}`);
		renameSync(oldPath, newPath);
		console.log(`Archived: ${file} → _${file}`);
	}

	const sevenDaysAgo = new Date(today);
	sevenDaysAgo.setDate(today.getDate() - 7);

	const [feedRes, profileRes] = await Promise.all([
		fetchWithRetry(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${ACTOR}&filter=posts_no_replies&limit=100`),
		fetchWithRetry(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${ACTOR}`),
	]);

	if (!feedRes.ok) {
		console.error(`Feed API error: ${feedRes.status} ${feedRes.statusText}`);
		process.exit(1);
	}

	const [data, profile] = await Promise.all([feedRes.json(), profileRes.json()]);
	const authorAvatar = profile.avatar ?? '';
	const authorName = profile.displayName || ACTOR;
	const profileUrl = `https://bsky.app/profile/${ACTOR}`;

	const recentPosts = data.feed
		.map((item) => item.post)
		.filter((post) => new Date(post.record.createdAt) >= sevenDaysAgo)
		.filter((post) => post.record.$type === 'app.bsky.feed.post')
		.sort((a, b) => new Date(b.record.createdAt) - new Date(a.record.createdAt))
		.slice(0, 3);

	if (recentPosts.length === 0) {
		console.log('No posts in the last 7 days, skipping digest.');
		process.exit(0);
	}

	const title = `Recent Bluesky chat`;
	const description = `${recentPosts.length} post${recentPosts.length === 1 ? '' : 's'} from Bluesky this week.`;

	const sections = await Promise.all(recentPosts.map(async (post) => {
		const postUrl = uriToUrl(post.uri);
		const timestamp = formatShortDateTime(post.record.createdAt);
		const postText = textToHtml(applyFacets(post.record.text, post.record.facets));

		let quoteHtml = '';
		if (post.embed?.$type === 'app.bsky.embed.record#view' && post.embed.record) {
			const quoted = post.embed.record;
			const qAuthor = quoted.author;
			const qHandle = qAuthor?.handle ?? '';
			const qName = qAuthor?.displayName || qHandle;
			const qAvatar = qAuthor?.avatar ?? '';
			const qProfileUrl = `https://bsky.app/profile/${qHandle}`;
			const qText = textToHtml(applyFacets(quoted.value?.text ?? '', quoted.value?.facets));

			let qLinkHtml = '';
			const externalEmbed = quoted.embeds?.find((e) => e.$type === 'app.bsky.embed.external#view');
			if (externalEmbed?.external) {
				const { uri, title: linkTitle, description: linkDesc } = externalEmbed.external;
				qLinkHtml = `\n<div class="skeet-quote-link"><a href="${uri}" target="_blank" rel="noopener noreferrer">${linkTitle}</a>${linkDesc ? `<span class="skeet-quote-link-desc">${linkDesc}</span>` : ''}</div>`;
			}

			quoteHtml = `
<div class="skeet-quote">
  <div class="skeet-quote-header">
    <img class="skeet-quote-avatar" src="${qAvatar}" alt="${qName}" /><a class="skeet-quote-name" href="${qProfileUrl}" target="_blank" rel="noopener noreferrer">${qName}</a><span class="skeet-quote-handle">@${qHandle}</span>
  </div>
  <div class="skeet-quote-body">${qText}${qLinkHtml}</div>
</div>`;
		}

		let footerHtml = '';
		const likesRes = await fetchWithRetry(`https://public.api.bsky.app/xrpc/app.bsky.feed.getLikes?uri=${encodeURIComponent(post.uri)}&limit=100`);
		if (likesRes.ok) {
			const likesData = await likesRes.json();
			if (likesData.likes?.length) {
				const avatars = likesData.likes
					.map(({ actor }) => `<a class="bsky-avatar" href="https://bsky.app/profile/${actor.handle || actor.did}" target="_blank" rel="noopener noreferrer"><img src="${actor.avatar}" alt="${actor.displayName || actor.handle}" title="${actor.displayName || actor.handle}" /></a>`)
					.join('');
				footerHtml = `\n<div class="skeet-footer"><p class="bsky-likes">${avatars}</p></div>`;
			}
		}

		return `<div class="skeet">
  <a class="skeet-author-avatar" href="${profileUrl}" target="_blank" rel="noopener noreferrer"><img src="${authorAvatar}" alt="${authorName}" /></a>
  <div class="skeet-main">
    <div class="skeet-header">
      <a class="skeet-display-name" href="${profileUrl}" target="_blank" rel="noopener noreferrer">${authorName}</a><span class="skeet-handle">@${ACTOR}</span><a class="skeet-timestamp" href="${postUrl}" target="_blank" rel="noopener noreferrer">${timestamp}</a>
    </div>
    <div class="skeet-body">${postText}${quoteHtml}</div>${footerHtml}
  </div>
</div>`;
	}));

	const body = sections.join('\n');

	const markdown = `---
title: "${title}"
pubDate: ${pubDate}
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

import { existsSync, writeFileSync, mkdirSync, unlinkSync, readdirSync, renameSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDate, parseFrontmatter } from './utils.mjs';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 15 * 60 * 1000;
const DIGEST_LOOKBACK_DAYS = 7;
const FEED_FETCH_LIMIT = 100;
const MAX_DIGEST_POSTS = 3;

function sleep(ms) { // pauses execution for ms milliseconds
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, attempt = 1) { // fetches a URL, retrying up to MAX_RETRIES times on network failure
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

function getSiteOriginatedUris() { // reads all blog post frontmatter and returns a Set of bskyPostUri values to exclude from digests
	const blogDir = join(__dirname, '..', 'src', 'data', 'blog');
	const uris = new Set();
	for (const file of readdirSync(blogDir)) {
		if (!file.endsWith('.md')) continue;
		const content = readFileSync(join(blogDir, file), 'utf-8');
		const fm = parseFrontmatter(content);
		if (fm.bskyPostUri) uris.add(fm.bskyPostUri);
	}
	return uris;
}

function uriToUrl(uri) { // converts an AT Protocol URI to a bsky.app post URL
	const rkey = uri.split('/').at(-1);
	return `https://bsky.app/profile/${ACTOR}/post/${rkey}`;
}


function formatShortDateTime(iso) { // formats an ISO date string as "1 Jan · 14:30"
	const d = new Date(iso);
	const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	return `${date} · ${time}`;
}

function applyFacets(text, facets) { // converts Bluesky facets (links, mentions) into HTML anchor tags within the post text
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

function textToHtml(text) { // wraps double-newline-separated paragraphs in <p> tags, converting single newlines to <br>
	return text
		.split('\n\n')
		.filter((p) => p.trim())
		.map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
		.join('\n');
}

function archiveExistingDigests(notesDir) { // renames any existing bsky-digest-*.md files to _prefixed to archive them
	const existing = readdirSync(notesDir).filter(
		(f) => /^bsky-digest-\d{4}-\d{2}-\d{2}\.md$/.test(f)
	);
	for (const file of existing) {
		renameSync(join(notesDir, file), join(notesDir, `_${file}`));
		console.log(`Archived: ${file} → _${file}`);
	}
}

async function fetchBskyData(since) { // fetches recent posts and profile from Bluesky, filtered to the lookback window and excluding site-originated posts
	const [feedRes, profileRes] = await Promise.all([
		fetchWithRetry(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${ACTOR}&filter=posts_no_replies&limit=${FEED_FETCH_LIMIT}`),
		fetchWithRetry(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${ACTOR}`),
	]);

	if (!feedRes.ok) {
		console.error(`Feed API error: ${feedRes.status} ${feedRes.statusText}`);
		process.exit(1);
	}

	const [data, profile] = await Promise.all([feedRes.json(), profileRes.json()]);
	const siteOriginatedUris = getSiteOriginatedUris();

	const posts = data.feed
		.map((item) => item.post)
		.filter((post) => new Date(post.record.createdAt) >= since)
		.filter((post) => post.record.$type === 'app.bsky.feed.post')
		.filter((post) => !siteOriginatedUris.has(post.uri))
		.sort((a, b) => new Date(b.record.createdAt) - new Date(a.record.createdAt))
		.slice(0, MAX_DIGEST_POSTS);

	return { posts, profile };
}

async function buildPostSection(post, { authorAvatar, authorName, profileUrl }) { // builds the full HTML card for a single Bluesky post, including embeds, quotes, and liker avatars
	const postUrl = uriToUrl(post.uri);
	const timestamp = formatShortDateTime(post.record.createdAt);
	const postText = textToHtml(applyFacets(post.record.text, post.record.facets));

	let externalHtml = '';
	if (post.embed?.$type === 'app.bsky.embed.external#view' && post.embed.external) {
		const { uri, title: linkTitle, description: linkDesc } = post.embed.external;
		const ytMatch = uri.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
		if (ytMatch) {
			const videoId = ytMatch[1];
			const urlParams = new URL(uri).searchParams;
			const start = urlParams.get('t') ?? urlParams.get('start');
			const src = `https://www.youtube-nocookie.com/embed/${videoId}${start ? `?start=${start}` : ''}`;
			externalHtml = `\n<div class="skeet-youtube"><iframe src="${src}" title="${linkTitle ?? ''}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
		} else {
			externalHtml = `\n<div class="skeet-external-link"><a href="${uri}" target="_blank" rel="noopener noreferrer">${linkTitle ?? uri}</a>${linkDesc ? `<span class="skeet-external-link-desc">${linkDesc}</span>` : ''}</div>`;
		}
	}

	let imagesHtml = '';
	const imageEmbed = post.embed?.$type === 'app.bsky.embed.images#view' ? post.embed : null;
	if (imageEmbed?.images?.length) {
		imagesHtml = imageEmbed.images
			.map((img) => `<img src="${img.fullsize}" alt="${img.alt ?? ''}" />`)
			.join('');
	}

	let quoteHtml = '';
	if (post.embed?.$type === 'app.bsky.embed.record#view' && post.embed.record) {
		const quoted = post.embed.record;
		const qHandle = quoted.author?.handle ?? '';
		const qName = quoted.author?.displayName || qHandle;
		const qAvatar = quoted.author?.avatar ?? '';
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
	const likesRes = await fetchWithRetry(`https://public.api.bsky.app/xrpc/app.bsky.feed.getLikes?uri=${encodeURIComponent(post.uri)}&limit=${FEED_FETCH_LIMIT}`);
	if (likesRes.ok) {
		let likesData;
		try {
			likesData = await likesRes.json();
		} catch {
			console.warn(`Could not parse likes response for ${post.uri}`);
		}
		if (likesData?.likes?.length) {
			const avatars = likesData.likes
				.map(({ actor }) => `<a class="bsky-avatar" href="https://bsky.app/profile/${actor.handle || actor.did}" target="_blank" rel="noopener noreferrer"><img src="${actor.avatar}" alt="${actor.displayName || actor.handle}" title="${actor.displayName || actor.handle}" /></a>`)
				.join('');
			footerHtml = `\n<div class="skeet-footer"><p class="bsky-avatars">${avatars}</p></div>`;
		}
	}

	return `<div class="skeet">
  <a class="skeet-author-avatar" href="${profileUrl}" target="_blank" rel="noopener noreferrer"><img src="${authorAvatar}" alt="${authorName}" /></a>
  <div class="skeet-main">
    <div class="skeet-header">
      <a class="skeet-display-name" href="${profileUrl}" target="_blank" rel="noopener noreferrer">${authorName}</a><span class="skeet-handle">@${ACTOR}</span><a class="skeet-timestamp" href="${postUrl}" target="_blank" rel="noopener noreferrer">${timestamp}</a>
    </div>
    <div class="skeet-body">${postText}${imagesHtml}${externalHtml}${quoteHtml}</div>${footerHtml}
  </div>
</div>`;
}

function buildMarkdown(title, pubDate, description, sections) { // assembles the final digest .md file content with frontmatter and post sections
	return `---
title: "${title}"
pubDate: ${pubDate}
description: "${description}"
---

${sections.join('\n')}
`;
}

async function main() { // archives the old digest, fetches recent posts, and writes a new digest .md file
	const today = new Date();
	const todayStr = today.toISOString().slice(0, 10);
	const pubDate = today.toISOString().slice(0, 16).replace('T', ' ');

	const notesDir = join(__dirname, '..', 'src', 'data', 'notes');
	const outputPath = join(notesDir, `bsky-digest-${todayStr}.md`);

	archiveExistingDigests(notesDir);

	const since = new Date(today);
	since.setDate(today.getDate() - DIGEST_LOOKBACK_DAYS);

	const { posts, profile } = await fetchBskyData(since);

	if (posts.length === 0) {
		console.log('No posts in the last 7 days, skipping digest.');
		process.exit(0);
	}

	const authorInfo = {
		authorAvatar: profile.avatar ?? '',
		authorName: profile.displayName || ACTOR,
		profileUrl: `https://bsky.app/profile/${ACTOR}`,
	};

	const title = `Recent Bluesky chat`;
	const description = `${posts.length} post${posts.length === 1 ? '' : 's'} from Bluesky this week.`;
	const sections = await Promise.all(posts.map((post) => buildPostSection(post, authorInfo)));

	mkdirSync(notesDir, { recursive: true });
	writeFileSync(outputPath, buildMarkdown(title, pubDate, description, sections), 'utf8');
	console.log(`Written: ${outputPath}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

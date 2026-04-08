import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = join(__dirname, '..', 'src', 'data', 'blog');
const BASE_URL = 'https://ronnie.fyi';

function parseFrontmatter(content) {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};
	const raw = match[1];
	const result = {};
	for (const line of raw.split('\n')) {
		const colonIdx = line.indexOf(':');
		if (colonIdx === -1) continue;
		const key = line.slice(0, colonIdx).trim();
		const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
		result[key] = value;
	}
	return result;
}

function rewriteFrontmatter(content, uri) {
	return content.replace(
		/^(---\n[\s\S]*?)postToBsky:\s*true(\n[\s\S]*?---)/,
		`$1bskyPostUri: "${uri}"$2`
	);
}

function slugFromFilename(filename) {
	return filename.replace(/\.md$/, '');
}

function buildUrl(slug, pubDate) {
	const d = new Date(pubDate);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	return `${BASE_URL}/${year}/${month}/${slug}/`;
}

function getChangedFiles() {
	try {
		const output = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf-8' });
		return output.trim().split('\n').filter(Boolean);
	} catch {
		// First commit or shallow clone — fall back to all blog files
		return readdirSync(BLOG_DIR).map((f) => `src/data/blog/${f}`);
	}
}

async function createSession(identifier, password) {
	const res = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ identifier, password }),
	});
	if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
	return res.json();
}

async function uploadBlob(accessJwt, imageBuffer, mimeType) {
	const res = await fetch('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessJwt}`,
			'Content-Type': mimeType,
		},
		body: imageBuffer,
	});
	if (!res.ok) throw new Error(`Blob upload failed: ${res.status} ${await res.text()}`);
	const data = await res.json();
	return data.blob;
}

async function createPost(accessJwt, did, record) {
	const res = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessJwt}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			repo: did,
			collection: 'app.bsky.feed.post',
			record,
		}),
	});
	if (!res.ok) throw new Error(`Post failed: ${res.status} ${await res.text()}`);
	return res.json();
}

async function main() {
	const identifier = process.env.BSKY_IDENTIFIER;
	const password = process.env.BSKY_APP_PASSWORD;
	if (!identifier || !password) {
		console.error('Missing BSKY_IDENTIFIER or BSKY_APP_PASSWORD');
		process.exit(1);
	}

	const changedFiles = getChangedFiles();
	const blogFiles = changedFiles.filter((f) => f.startsWith('src/data/blog/') && f.endsWith('.md'));

	const targets = [];
	for (const relPath of blogFiles) {
		const filename = relPath.split('/').at(-1);
		if (filename.startsWith('_')) continue;
		const fullPath = join(__dirname, '..', relPath);
		let content;
		try {
			content = readFileSync(fullPath, 'utf-8');
		} catch {
			continue; // file deleted
		}
		const fm = parseFrontmatter(content);
		if (fm.postToBsky !== 'true') continue;
		targets.push({ filename, fullPath, content, fm });
	}

	if (targets.length === 0) {
		console.log('No posts flagged for Bluesky.');
		return;
	}

	const { accessJwt, did } = await createSession(identifier, password);

	for (const { filename, fullPath, content, fm } of targets) {
		const slug = slugFromFilename(filename);
		const url = buildUrl(slug, fm.pubDate);
		const postText = `${fm.title}\n\n${url}`;

		let thumb;
		const ogImageUrl = `${BASE_URL}/og/${slug}.png`;
		try {
			const imgRes = await fetch(ogImageUrl);
			if (imgRes.ok) {
				const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
				thumb = await uploadBlob(accessJwt, imgBuffer, 'image/png');
			}
		} catch (err) {
			console.warn(`Could not fetch OG image for ${slug}: ${err.message}`);
		}

		const embed = {
			$type: 'app.bsky.embed.external',
			external: {
				uri: url,
				title: fm.title,
				description: fm.description ?? '',
				...(thumb ? { thumb } : {}),
			},
		};

		const record = {
			$type: 'app.bsky.feed.post',
			text: postText,
			createdAt: new Date().toISOString(),
			embed,
		};

		const result = await createPost(accessJwt, did, record);
		console.log(`Posted: ${result.uri}`);

		const updated = rewriteFrontmatter(content, result.uri);
		writeFileSync(fullPath, updated, 'utf-8');
		console.log(`Rewrote frontmatter: ${filename}`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

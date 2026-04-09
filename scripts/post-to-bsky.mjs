import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BASE_URL, getPostUrl, parseFrontmatter } from './utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = join(__dirname, '..', 'src', 'data', 'blog');

const MAX_BLOB_SIZE = 1_000_000;
const OG_IMAGE_WIDTH = 800;
const OG_IMAGE_QUALITY = 85;


function rewriteFrontmatter(content, uri) {
	return content.replace(
		/^(---\n[\s\S]*?)postToBsky:\s*true(\n[\s\S]*?---)/,
		`$1bskyPostUri: "${uri}"$2`
	);
}

function slugFromFilename(filename) {
	return filename.replace(/\.md$/, '');
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

	const targets = [];
	for (const filename of readdirSync(BLOG_DIR)) {
		if (!filename.endsWith('.md') || filename.startsWith('_')) continue;
		const fullPath = join(BLOG_DIR, filename);
		let content;
		try {
			content = readFileSync(fullPath, 'utf-8');
		} catch {
			continue; // file deleted
		}
		const fm = parseFrontmatter(content);
		if (fm.postToBsky !== 'true') continue;
		if (fm.pubDate && new Date(fm.pubDate) > new Date()) continue;
		targets.push({ filename, fullPath, content, fm });
	}

	if (targets.length === 0) {
		console.log('No posts flagged for Bluesky.');
		return;
	}

	const { accessJwt, did } = await createSession(identifier, password);

	for (const { filename, fullPath, content, fm } of targets) {
		const slug = slugFromFilename(filename);
		const url = getPostUrl(fm.pubDate, slug, { absolute: true, trailingSlash: true });
		const postText = `${fm.title}\n\n${url}`;
		const textBytes = Buffer.from(postText, 'utf-8');
		const urlBytes = Buffer.from(url, 'utf-8');
		const urlByteStart = textBytes.indexOf(urlBytes);
		const facets = [
			{
				index: { byteStart: urlByteStart, byteEnd: urlByteStart + urlBytes.length },
				features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }],
			},
		];

		let thumb;
		const ogImageUrl = `${BASE_URL}/og/${slug}.png`;
		try {
			const imgRes = await fetch(ogImageUrl);
			if (imgRes.ok) {
				let imgBuffer = Buffer.from(await imgRes.arrayBuffer());
				if (imgBuffer.length > MAX_BLOB_SIZE) {
					imgBuffer = await sharp(imgBuffer)
						.resize({ width: OG_IMAGE_WIDTH })
						.jpeg({ quality: OG_IMAGE_QUALITY })
						.toBuffer();
					thumb = await uploadBlob(accessJwt, imgBuffer, 'image/jpeg');
				} else {
					thumb = await uploadBlob(accessJwt, imgBuffer, 'image/png');
				}
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
			facets,
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

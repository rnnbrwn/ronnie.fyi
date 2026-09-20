import sharp from 'sharp';
import { BASE_URL, getPostUrl } from './utils.mjs';
import { decodeEntities, fetchGraphQL, stripTags, updatePostMeta } from './wordpress.mjs';

const FLAGGED_POSTS_QUERY = `
	query FlaggedPosts {
		posts(first: 100) {
			nodes {
				databaseId
				slug
				title
				date
				dateGmt
				excerpt
				blogPostMeta { postToBsky bskyPostUri }
			}
		}
	}
`;

const MAX_BLOB_SIZE = 1_000_000;
const OG_IMAGE_WIDTH = 800;
const OG_IMAGE_QUALITY = 85;



async function createSession(identifier, password) { // authenticates with Bluesky and returns an access token and DID
	const res = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ identifier, password }),
	});
	if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
	return res.json();
}

async function uploadBlob(accessJwt, imageBuffer, mimeType) { // uploads a binary blob (image) to Bluesky and returns the blob reference
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

async function createPost(accessJwt, did, record) { // publishes a post record to Bluesky and returns the result including the post URI
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

async function main() { // finds posts flagged for Bluesky, authenticates, and posts each with an OG image embed
	const identifier = process.env.BSKY_IDENTIFIER;
	const password = process.env.BSKY_APP_PASSWORD;
	if (!identifier || !password) {
		console.error('Missing BSKY_IDENTIFIER or BSKY_APP_PASSWORD');
		process.exit(1);
	}

	const { posts } = await fetchGraphQL(FLAGGED_POSTS_QUERY);
	const targets = posts.nodes.filter((post) => {
		const meta = post.blogPostMeta;
		if (!meta?.postToBsky || meta.bskyPostUri) return false;
		return new Date(`${post.dateGmt}Z`) <= new Date(); // not scheduled for the future
	});

	if (targets.length === 0) {
		console.log('No posts flagged for Bluesky.');
		return;
	}

	const { accessJwt, did } = await createSession(identifier, password);

	for (const post of targets) {
		const slug = post.slug;
		const title = decodeEntities(post.title);
		const url = getPostUrl(post.date, slug, { absolute: true, trailingSlash: true });
		const postText = `${title}\n\n${url}`;
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
				title,
				description: stripTags(post.excerpt),
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

		try {
			await updatePostMeta(post.databaseId, { bsky_post_uri: result.uri, post_to_bsky: false });
		} catch (err) {
			// The post is already on Bluesky; without this write-back the next run would post it again.
			console.error(`POSTED but could not record the URI in WordPress. Set bsky_post_uri to ${result.uri} on "${title}" and untick "Post to Bluesky" by hand.`);
			throw err;
		}
		console.log(`Recorded Bluesky URI in WordPress: ${slug}`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

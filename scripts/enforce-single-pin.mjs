/**
 * enforce-single-pin.mjs
 *
 * If more than one blog post has `pinned: true`, keeps only the newest one
 * pinned and sets the rest to `pinned: false`.
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const BLOG_DIR = new URL('../src/data/blog', import.meta.url).pathname;

const files = await readdir(BLOG_DIR);
const mdFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('_'));

const pinned = [];

for (const file of mdFiles) {
	const filePath = join(BLOG_DIR, file);
	const content = await readFile(filePath, 'utf-8');

	if (!/^pinned:\s*true$/m.test(content)) continue;

	// Extract pubDate from frontmatter
	const pubDateMatch = content.match(/^pubDate:\s*(.+)$/m);
	if (!pubDateMatch) {
		console.warn(`${file}: has pinned: true but no pubDate — skipping`);
		continue;
	}

	pinned.push({
		file,
		filePath,
		content,
		pubDate: new Date(pubDateMatch[1].trim()),
	});
}

if (pinned.length <= 1) {
	console.log(`${pinned.length === 1 ? `1 pinned post found (${pinned[0].file}) — nothing to do.` : 'No pinned posts found.'}`);
	process.exit(0);
}

// Sort descending by date — newest first
pinned.sort((a, b) => b.pubDate - a.pubDate);

const [keep, ...unpin] = pinned;

console.log(`${pinned.length} pinned posts found.`);
console.log(`Keeping pinned: ${keep.file} (${keep.pubDate.toISOString().slice(0, 10)})`);

for (const { file, filePath, content } of unpin) {
	const updated = content.replace(/^pinned:\s*true$/m, 'pinned: false');
	await writeFile(filePath, updated, 'utf-8');
	console.log(`Unpinned: ${file}`);
}

// Turns a run of 3+ WordPress Image blocks that appear back to back into a
// "feature image + small thumbnail grid" layout, so a burst of photos doesn't just
// stack full-width down the page. Clicking any image opens ImageLightbox.astro's
// modal (see src/components/ImageLightbox.astro), which reads the markup this
// produces.
//
// WordPress's Gallery block also just wraps a run of Image blocks in an extra
// <figure>, so the same "3+ in a row" rule covers both: a Gallery block, or plain
// Image blocks placed one after another with nothing else between them. 1-2 images
// are left exactly as WordPress rendered them (full-width, one per line).
import { stripTags } from './html';

// A single WordPress "Image" block: <figure class="wp-block-image ..."><img ...>
// with an optional <figcaption>. An Image block never nests another figure inside
// itself, so this (non-recursive) pattern is safe to match directly.
const IMAGE_FIGURE = /<figure\b[^>]*\bclass="[^"]*\bwp-block-image\b[^"]*"[^>]*>\s*(<img\b[^>]*>)\s*(?:<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>\s*)?<\/figure>/g;

// The opening tag of a WordPress "Gallery" block.
const GALLERY_OPEN = /<figure\b[^>]*\bclass="[^"]*\bwp-block-gallery\b[^"]*"[^>]*>/;

// Any <figure>/</figure> tag — used to find a gallery's OWN closing tag by tracking
// nesting depth, since the images it wraps are also <figure> elements.
const ANY_FIGURE_TAG = /<figure\b[^>]*>|<\/figure>/g;

interface ExtractedImage {
	imgTag: string;
	caption: string;
	fullSrc: string;
	matchStart: number;
	matchEnd: number;
}

export function groupSequentialImages(html: string): string {
	const unwrapped = unwrapGalleries(html);

	const images: ExtractedImage[] = [];
	IMAGE_FIGURE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = IMAGE_FIGURE.exec(unwrapped))) {
		images.push({
			imgTag: m[1],
			caption: m[2] ? stripTags(m[2]) : '',
			fullSrc: pickLargestSrcsetUrl(m[1]),
			matchStart: m.index,
			matchEnd: m.index + m[0].length,
		});
	}
	if (images.length < 3) return unwrapped; // can never form a run of 3+

	// Split into runs where only whitespace separates one image from the next;
	// anything else in between (a paragraph, a heading, ...) starts a new run.
	const runs: ExtractedImage[][] = [[images[0]]];
	for (let i = 1; i < images.length; i++) {
		const gap = unwrapped.slice(images[i - 1].matchEnd, images[i].matchStart);
		if (/^\s*$/.test(gap)) {
			runs[runs.length - 1].push(images[i]);
		} else {
			runs.push([images[i]]);
		}
	}

	// Replace each run of 3+ with the grouped markup; runs of 1-2 are left untouched.
	let result = '';
	let cursor = 0;
	for (const run of runs) {
		const start = run[0].matchStart;
		const end = run[run.length - 1].matchEnd;
		result += unwrapped.slice(cursor, start);
		result += run.length >= 3 ? renderImageGroup(run) : unwrapped.slice(start, end);
		cursor = end;
	}
	return result + unwrapped.slice(cursor);
}

// Removes just a Gallery block's own <figure class="wp-block-gallery ..."> and its
// matching </figure>, leaving the Image-block figures it contains in place — so a
// gallery of images and the same images placed as plain sequential Image blocks end
// up as identical markup, and only one code path is needed to group them.
//
// Known limitation: a gallery-level caption (WordPress can add one to the gallery as
// a whole, separate from each image's own caption) is left exactly where it sits in
// the markup once unwrapped, rather than attached to the group — rare in practice,
// and no content is lost, just placed plainly rather than styled as a group caption.
function unwrapGalleries(html: string): string {
	let result = html;
	let match: RegExpMatchArray | null;
	while ((match = result.match(GALLERY_OPEN))) {
		const openStart = match.index!;
		const openEnd = openStart + match[0].length;
		const closeEnd = findMatchingFigureClose(result, openEnd);
		if (closeEnd === -1) break; // malformed markup — leave the rest of the content alone
		const closeStart = closeEnd - '</figure>'.length;
		result = result.slice(0, openStart) + result.slice(openEnd, closeStart) + result.slice(closeEnd);
	}
	return result;
}

// Finds the end of the </figure> that matches the gallery figure opened just before
// `from`, by walking every <figure>/</figure> tag and tracking nesting depth.
function findMatchingFigureClose(html: string, from: number): number {
	ANY_FIGURE_TAG.lastIndex = from;
	let depth = 1;
	let m: RegExpExecArray | null;
	while ((m = ANY_FIGURE_TAG.exec(html))) {
		depth += m[0] === '</figure>' ? -1 : 1;
		if (depth === 0) return ANY_FIGURE_TAG.lastIndex;
	}
	return -1;
}

// The widest image in an <img>'s srcset, for the lightbox's full-size view; falls
// back to the plain src when there's no srcset.
function pickLargestSrcsetUrl(imgTag: string): string {
	const src = imgTag.match(/\bsrc="([^"]*)"/)?.[1] ?? '';
	const srcset = imgTag.match(/\bsrcset="([^"]*)"/)?.[1];
	if (!srcset) return src;

	let best = { url: src, width: 0 };
	for (const entry of srcset.split(',')) {
		const [url, descriptor] = entry.trim().split(/\s+/);
		const width = descriptor?.endsWith('w') ? parseInt(descriptor, 10) : 0;
		if (url && width > best.width) best = { url, width };
	}
	return best.url;
}

function renderImageGroup(images: ExtractedImage[]): string {
	const [feature, ...rest] = images;
	const item = (image: ExtractedImage, index: number, extraClass: string) => `
		<figure class="image-group-item ${extraClass}">
			<button type="button" class="image-group-trigger" data-full="${escapeAttr(image.fullSrc)}"${image.caption ? ` data-caption="${escapeAttr(image.caption)}"` : ''} aria-label="View image ${index + 1} of ${images.length}, larger">
				${image.imgTag}
			</button>
		</figure>`;

	return `
	<div class="image-group" data-image-group>
		${item(feature, 0, 'image-group-feature')}
		<div class="image-group-grid">${rest.map((image, i) => item(image, i + 1, 'image-group-thumb')).join('')}</div>
	</div>`;
}

function escapeAttr(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

import { visit } from 'unist-util-visit';

const ytRegex =
	/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;

function getYouTubeId(node) {
	const [child] = node.children ?? [];
	if (!child) return null;
	// Plain text URL
	if (child.type === 'text') {
		const match = child.value?.trim().match(ytRegex);
		if (match) return match[1];
	}
	// Auto-linked URL (link whose text matches its href)
	if (child.type === 'link') {
		const match = child.url?.match(ytRegex);
		if (match) return match[1];
	}
	return null;
}

export default function remarkYouTube() {
	return (tree) => {
		visit(tree, 'paragraph', (node, index, parent) => {
			const videoId = getYouTubeId(node);
			if (!videoId) return;

			// Use a div wrapper with data attribute so rehype preserves it
			parent.children[index] = {
				type: 'html',
				value: `<div class="youtube-embed"><iframe src="https://www.youtube-nocookie.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" style="aspect-ratio: 16/9; width: 100%; height: auto;"></iframe></div>`,
			};
		});
	};
}

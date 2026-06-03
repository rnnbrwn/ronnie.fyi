import { getCollection } from 'astro:content';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import type { APIRoute } from 'astro';

function getLogoDataUri(color: string): string { // extracts the SVG from Logo.astro, fills it with the given color, and returns it as a base64 data URI
	const logoPath = join(process.cwd(), 'src/components/Logo.astro');
	const raw = readFileSync(logoPath, 'utf-8');
	const svgMatch = raw.match(/<svg[\s\S]*<\/svg>/);
	if (!svgMatch) throw new Error('Could not extract SVG from Logo.astro');
	const svg = svgMatch[0]
		.replace(/currentColor/g, color)
		.replace(/class=\{[^}]+\}/g, '')
		.replace(/aria-hidden=\{[^}]+\}/g, '')
		.replace(/focusable=\{[^}]+\}/g, '');
	return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export async function getStaticPaths() { // tells Astro which posts need an OG image route (those with both a feature image and postToBsky)
	const posts = await getCollection('blog');
	return posts
		.filter((post) => post.data.image?.url && post.data.postToBsky)
		.map((post) => ({
			params: { slug: post.id },
			props: { post },
		}));
}

export const GET: APIRoute = async ({ props, params }) => { // generates a 1200×630 OG image PNG for a post using Satori and sharp
	const { post } = props;

	const cachedPath = join(process.cwd(), 'dist/og', `${params.slug}.png`);
	if (existsSync(cachedPath)) {
		return new Response(readFileSync(cachedPath), {
			headers: { 'Content-Type': 'image/png' },
		});
	}


	const fontBoldBuffer = readFileSync(join(process.cwd(), 'public/fonts/Geomanist-Bold.otf'));

	const imageUrl = post.data.image!.url;
	const imagePath = join(process.cwd(), 'src/assets/images', imageUrl);
	const rawBuffer = readFileSync(imagePath);
	const ext = imageUrl.split('.').pop()?.toLowerCase();
	const needsConversion = ext === 'webp' || ext === 'gif' || ext === 'avif';
	const imageBuffer = needsConversion
		? await sharp(rawBuffer).jpeg({ quality: 90 }).toBuffer()
		: rawBuffer;
	const mimeType = ext === 'png' && !needsConversion ? 'image/png' : 'image/jpeg';
	const imageBase64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

	const ogBackground = (src: string) => ({ // full-bleed background image layer
		type: 'img',
		props: {
			src,
			style: { position: 'absolute', top: 0, left: 0, width: '1200px', height: '630px', objectFit: 'cover' },
		},
	});

	const ogGradientOverlay = () => ({ // dark gradient overlay to improve text legibility
		type: 'div',
		props: {
			style: {
				position: 'absolute',
				top: 0,
				left: 0,
				width: '1200px',
				height: '630px',
				background: 'linear-gradient(to bottom, rgba(21,21,21,0.15) 0%, rgba(21,21,21,0.5) 40%, rgba(21,21,21,0.92) 100%)',
			},
		},
	});

	const ogLogo = () => ({ // site logo positioned top-right
		type: 'img',
		props: {
			src: getLogoDataUri('#f6f4f5'),
			style: { position: 'absolute', top: '32px', right: '48px', width: '190px', height: '60px', opacity: 0.85 },
		},
	});

	const ogTitle = (title: string) => ({ // post title text block with accent rule, positioned bottom-left
		type: 'div',
		props: {
			style: {
				position: 'absolute',
				bottom: '56px',
				left: '56px',
				right: '56px',
				display: 'flex',
				flexDirection: 'column',
				gap: '16px',
			},
			children: [
				{
					type: 'div',
					props: {
						style: { width: '56px', height: '5px', backgroundColor: '#d81e5b', borderRadius: '2px' },
					},
				},
				{
					type: 'div',
					props: {
						style: {
							color: '#ffffff',
							fontSize: '56px',
							fontFamily: 'Geomanist',
							fontWeight: 700,
							lineHeight: 1.15,
							letterSpacing: '-0.01em',
							maxWidth: '900px',
						},
						children: title,
					},
				},
			],
		},
	});

	const svg = await satori(
		{
			type: 'div',
			props: {
				style: {
					width: '1200px',
					height: '630px',
					display: 'flex',
					flexDirection: 'column',
					position: 'relative',
					overflow: 'hidden',
					backgroundColor: '#151515',
				},
				children: [
					ogBackground(imageBase64),
					ogGradientOverlay(),
					ogLogo(),
					ogTitle(post.data.title),
				],
			},
		},
		{
			width: 1200,
			height: 630,
			fonts: [{ name: 'Geomanist', data: fontBoldBuffer, weight: 700, style: 'normal' }],
		}
	);

	const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
	const png = resvg.render().asPng();

	return new Response(png, {
		headers: { 'Content-Type': 'image/png' },
	});
};

# ronnie.fyi

Personal site at [ronnie.fyi](https://ronnie.fyi). Writing about music, technology, and whatever else. Online in some guise or other since 2001.

Built with [Astro](https://astro.build), styled with Sass, deployed to Dreamhost via GitHub Actions.

## Project structure

```text
/
├── public/
│   ├── fonts/              # Self-hosted fonts (Geomanist)
│   └── favicon.svg
├── scripts/
│   ├── generate-bsky-digest.mjs  # Bluesky digest generator (see below)
│   └── post-to-bsky.mjs          # Bluesky auto-post on deploy (see below)
├── src/
│   ├── components/         # Astro components (Navigation, Post, Footer, icons, etc.)
│   ├── data/
│   │   ├── blog/           # Markdown blog posts
│   │   └── notes/          # Auto-generated Bluesky digest posts
│   ├── layouts/
│   │   └── Base.astro      # Main page layout
│   ├── pages/              # File-based routes (index, about, uses, blog, rss, og, etc.)
│   ├── plugins/            # Remark plugins (YouTube embed)
│   ├── styles/             # Sass architecture (abstracts, base, components, layout, utilities)
│   ├── utils/              # Shared utilities (getSortedPosts, timeAgo)
│   └── content.config.ts   # Content collection schema
└── package.json
```

## Blog posts

Posts live in `src/data/blog/` as Markdown files. Files prefixed with `_` are drafts and excluded from the collection.

Frontmatter fields:

```yaml
title: 'Post title'
pubDate: 2026-01-01
description: 'Short description'
tags: ['tag-one', 'tag-two']
pinned: false # Set to true to pin to the top of the homepage feed
image: # Optional
  url: '/image.webp'
  alt: 'Alt text'
  source: 'https://example.com' # Optional image credit URL
```

### Post images

Images should use a standard aspect ratio. At the default content width of 793px:

| Ratio | Dimensions   |
| :---- | :----------- |
| 16:9  | 793 × 446px  |
| 4:3   | 793 × 595px  |
| 1:1   | 793 × 793px  |
| 3:4   | 793 × 1057px |
| 9:16  | 793 × 1410px |

## Bluesky auto-post

When a blog post has `postToBsky: true` in its frontmatter, it will be automatically posted to Bluesky after the next successful deploy.

```yaml
postToBsky: true # triggers a post to Bluesky on next deploy
```

The workflow (`.github/workflows/post-to-bsky.yml`) runs after the deploy workflow completes. It calls `scripts/post-to-bsky.mjs`, which:

1. Scans `src/data/blog/` for any file containing `postToBsky: true`
2. Checks `git diff --name-only HEAD~1 HEAD` to confirm the file was part of the current push
3. Fetches the OG image from `https://ronnie.fyi/og/[slug].png`, uploads it to Bluesky's blob store, and posts with a link card embed
4. Rewrites the frontmatter in-place: replaces `postToBsky: true` with `bskyPostUri: "at://..."` as a permanent record and to prevent re-posting

Required GitHub secrets: `BLUESKY_USERNAME` and `BLUESKY_PASSWORD` (Bluesky app password).

Posts originating from the site are excluded from the weekly digest — the digest script reads all `bskyPostUri` values and filters them out.

## OG images

OG images are generated at build time via `src/pages/og/[slug].png.ts` using Satori + sharp. Each post with a feature image gets a 1200×630 PNG. Design: feature image as full background, dark gradient overlay, crimson accent bar, post title in Geomanist Bold bottom-left, `ronnie.fyi` SVG in top-right.

The `og:image` meta tag is set on all blog post pages that have a feature image.

## Bluesky digest

A weekly digest of Bluesky posts is auto-generated every **Friday at 08:00 UTC** (08:00 GMT / 09:00 BST) via `.github/workflows/bsky-digest.yml`. It fetches posts from the last 7 days from the public AT Proto API — no credentials needed. If there are no posts that week, nothing is generated.

When the workflow runs it:

1. Calls the Bluesky public API for posts from `ronnie.fyi`
2. Writes a Markdown file to `src/data/notes/bsky-digest-YYYY-MM-DD.md`
3. Commits and pushes to `main`, which triggers the deploy workflow

To run it manually:

```bash
node scripts/generate-bsky-digest.mjs
```

If a digest file for today already exists, the script exits without overwriting it.

Digest posts appear on the homepage mixed with blog posts but are excluded from `/blog`.

## Commands

All commands are run from the root of the project:

| Command           | Action                                     |
| :---------------- | :----------------------------------------- |
| `npm install`     | Install dependencies                       |
| `npm run dev`     | Start local dev server at `localhost:4321` |
| `npm run build`   | Build production site to `./dist/`         |
| `npm run preview` | Preview production build locally           |

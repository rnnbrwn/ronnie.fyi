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
│   └── generate-bsky-digest.mjs  # Bluesky digest generator (see below)
├── src/
│   ├── components/         # Astro components (Navigation, Post, Footer, icons, etc.)
│   ├── data/
│   │   ├── blog/           # Markdown blog posts
│   │   └── notes/          # Auto-generated Bluesky digest posts
│   ├── layouts/
│   │   └── Base.astro      # Main page layout
│   ├── pages/              # File-based routes (index, about, uses, blog, rss, etc.)
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
pinned: false         # Set to true to pin to the top of the homepage feed
image:                # Optional
  url: '/image.webp'
  alt: 'Alt text'
  source: 'https://example.com'  # Optional image credit URL
```

### Post images

Images should use a standard aspect ratio. At the default content width of 793px:

| Ratio | Dimensions    |
| :---- | :------------ |
| 16:9  | 793 × 446px   |
| 4:3   | 793 × 595px   |
| 1:1   | 793 × 793px   |
| 3:4   | 793 × 1057px  |
| 9:16  | 793 × 1410px  |

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

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Start local dev server at `localhost:4321`   |
| `npm run build`   | Build production site to `./dist/`           |
| `npm run preview` | Preview production build locally             |

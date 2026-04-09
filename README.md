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
│   ├── utils/              # Shared utilities (getSortedPosts, bsky)
│   └── content.config.ts   # Content collection schema
└── package.json
```

## Blog posts

Posts live in `src/data/blog/` as Markdown files. Files prefixed with `_` are drafts and excluded from the collection.

Frontmatter fields:

```yaml
title: 'Post title'
pubDate: 2026-01-01        # Supports time: 2026-01-01 09:00. Post won't appear until this date/time.
description: 'Short description'
tags: ['tag-one', 'tag-two']
pinned: false              # Set to true to pin to the top of the homepage feed
pinnedFrom: 2026-01-01    # Optional. Pin starts no earlier than this date (defaults to pubDate behaviour)
pinnedUntil: 2026-01-08   # Optional. Pin is removed after this date on the next scheduled rebuild
stale: false               # Set to true to show an "outdated" warning on the post
image:                     # Optional
  url: 'image.webp'
  alt: 'Alt text'
  source: 'https://example.com' # Optional image credit URL
postToBsky: true           # Set to true to auto-post to Bluesky after the next deploy (see below)
bskyPostUri: "at://..."   # Written automatically after posting. Do not set manually.
```

`_` prefixed files (e.g. `_template.md`) are excluded from the collection and treated as drafts.

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

When a blog post has `postToBsky: true` in its frontmatter, it will be automatically posted to Bluesky after the next successful deploy — provided the post's `pubDate` is not in the future.

```yaml
postToBsky: true # triggers a post to Bluesky on next deploy (only if pubDate has passed)
```

The workflow (`.github/workflows/post-to-bsky.yml`) runs after the deploy workflow completes. It calls `scripts/post-to-bsky.mjs`, which:

1. Scans `src/data/blog/` for any file containing `postToBsky: true`
2. Skips any post whose `pubDate` is in the future
3. Fetches the OG image from `https://ronnie.fyi/og/[slug].png`, uploads it to Bluesky's blob store, and posts with a link card embed
4. Rewrites the frontmatter in-place: replaces `postToBsky: true` with `bskyPostUri: "at://..."` as a permanent record and to prevent re-posting

Required GitHub secrets: `BLUESKY_USERNAME` and `BLUESKY_PASSWORD` (Bluesky app password).

Posts originating from the site are excluded from the weekly digest — the digest script reads all `bskyPostUri` values and filters them out.

## RSS feed

An RSS feed is available at `/rss.xml`. It includes all published blog posts (not digest notes) with full post content and feature images. Media RSS extensions (`media:content`, `media:thumbnail`) are included for feed readers that support them.

## OG images

OG images are generated at build time via `src/pages/og/[slug].png.ts` using Satori + sharp. Only posts with **both** a feature image and `postToBsky` set get a 1200×630 PNG. Design: feature image as full background, dark gradient overlay, pink-red accent bar, post title in Geomanist Bold bottom-left, `ronnie.fyi` SVG in top-right.

The `og:image` meta tag is set on all blog post pages that have a feature image.

## Bluesky digest

A weekly digest of Bluesky posts is auto-generated every **Friday at 08:00 UTC** (08:00 GMT / 09:00 BST) via `.github/workflows/bsky-digest.yml`. It fetches posts from the last 7 days from the public AT Proto API — no credentials needed. If there are no posts that week, nothing is generated.

When the workflow runs it:

1. Calls the Bluesky public API for posts from `ronnie.fyi`
2. Writes a Markdown file to `src/data/notes/bsky-digest-YYYY-MM-DD.md`
3. Commits the file and explicitly triggers the deploy workflow via `gh workflow run` (only if a digest was created)

To run it manually:

```bash
node scripts/generate-bsky-digest.mjs
```

If a digest file for today already exists, the script exits without overwriting it.

Digest posts appear on the homepage mixed with blog posts but are excluded from `/posts`.

## Scheduled rebuilds

The deploy workflow (`.github/workflows/deploy.yml`) runs on every push to `main` and also on a cron schedule every 2 hours. This means time-sensitive features resolve automatically without a manual push:

- Future-dated posts go live within 2 hours of their `pubDate`
- `pinnedUntil` dates are respected within the same window
- Bluesky auto-posts are picked up once a post's `pubDate` passes

## Commands

All commands are run from the root of the project:

| Command           | Action                                     |
| :---------------- | :----------------------------------------- |
| `npm install`     | Install dependencies                       |
| `npm run dev`     | Start local dev server at `localhost:4321` |
| `npm run build`   | Build production site to `./dist/`         |
| `npm run preview` | Preview production build locally           |

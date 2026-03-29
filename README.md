# ronnie.fyi

Personal site at [ronnie.fyi](https://ronnie.fyi). Writing about music, technology, and whatever else. Online in some guise or other since 2001.

Built with [Astro](https://astro.build), styled with Sass, deployed to Dreamhost via GitHub Actions.

## Project structure

```text
/
├── public/
│   ├── fonts/              # Self-hosted fonts (Geomanist)
│   └── favicon.svg
├── src/
│   ├── components/         # Astro components (Navigation, Post, Footer, icons, etc.)
│   ├── data/
│   │   └── blog/           # Markdown blog posts
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
author: 'Ronnie'
tags: ['tag-one', 'tag-two']
pinned: false         # Set to true to pin to the top of the homepage feed
image:                # Optional
  url: '/image.webp'
  alt: 'Alt text'
  source: 'https://example.com'  # Optional image credit URL
```

## Commands

All commands are run from the root of the project:

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Start local dev server at `localhost:4321`   |
| `npm run build`   | Build production site to `./dist/`           |
| `npm run preview` | Preview production build locally             |

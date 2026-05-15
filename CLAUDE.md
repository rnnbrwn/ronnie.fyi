# ronnie.fyi — Claude context

Personal website/blog at ronnie.fyi. Built with Astro, styled with Sass, deployed to Dreamhost via GitHub Actions rsync.

## Stack

- **Astro 6** — static site with file-based routing
- **Sass/SCSS** — 7-1 architecture (`src/styles/`)
- **Preact** — used for interactive islands (e.g. `BskyInteractors.tsx`)
- **Node ≥22.12** (see `.nvmrc`)
- **Dreamhost** — production host, deployed via rsync over SSH

## Content types

### Blog posts (`src/data/blog/*.md`)

Files prefixed `_` are drafts — excluded from the Astro content collection and Bluesky posting. The canonical template is `src/data/blog/_template.md`.

Frontmatter schema (defined in `src/content.config.ts`):

```yaml
title: 'Post title'
pubDate: 2026-01-01           # supports time: 2026-01-01 09:00. Future dates = scheduled.
description: 'Short description'
tags: ['tag-one', 'tag-two']
pinned: false                 # true = pinned at top of homepage feed
pinnedFrom: 2026-01-01        # optional, defaults to pubDate behaviour
pinnedUntil: 2026-01-08       # optional, auto-unpins on next rebuild after this date
stale: false                  # true = "outdated content" warning on post page
image:                        # optional feature image
  url: 'filename.webp'        # relative to public/images/
  alt: 'Alt text'
  source: 'https://...'       # optional credit URL
postToBsky: true              # triggers Bluesky auto-post after next deploy (only if pubDate has passed)
bskyPostUri: 'at://...'       # written automatically post-posting — do not set manually
```

Only one post can be pinned at a time (enforced by `scripts/enforce-single-pin.mjs`).

### Notes (`src/data/notes/*.md`)

Auto-generated weekly Bluesky digests. Schema: `title`, `pubDate`, `description` only. Files prefixed `_` are archived digests. Do not create notes manually.

## Key scripts

| Script | Purpose |
|---|---|
| `scripts/generate-bsky-digest.mjs` | Fetch recent Bluesky posts, write a digest note |
| `scripts/post-to-bsky.mjs` | Post blog posts with `postToBsky: true` to Bluesky |
| `scripts/enforce-single-pin.mjs` | Validate only one post is pinned |

## GitHub Actions workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `deploy.yml` | Push to main + cron every 2h | Build + rsync to Dreamhost |
| `post-to-bsky.yml` | After successful deploy | Run `post-to-bsky.mjs`, commit frontmatter rewrites |
| `bsky-digest.yml` | Fridays 08:00 UTC | Run `generate-bsky-digest.mjs`, commit, trigger deploy |

The 2-hour cron deploy means future-dated posts and `pinnedUntil` dates resolve automatically.

## WordPress CMS (headless)

Static pages (About, Uses, Changelog) are fetched at build time via WPGraphQL. All queries live in `src/utils/wordpress.ts`. WordPress-sourced HTML must be wrapped in `<div class="wp-content">` and styled with `.wp-content :global(element)`. CMS internal links are auto-rewritten to relative URLs at build time.

Related repos: `rnnbrwn-cms` (deployment), `rnnbrwn-themes` (themes), `rnnbrwn-plugins` (plugins).

## OG images

Generated at build time via `src/pages/og/[slug].png.ts` using Satori + sharp. Only posts with both a feature image and `postToBsky` set get an OG image (1200×630 PNG).

## Post images — standard dimensions

At content width of 793px:

| Ratio | Dimensions |
|---|---|
| 16:9 | 793 × 446px |
| 4:3 | 793 × 595px |
| 1:1 | 793 × 793px |

Images go in `public/images/`. Reference in frontmatter as just the filename (e.g. `my-image.webp`).

## Dev commands

```bash
npm run dev      # dev server at localhost:4321
npm run build    # production build to ./dist/
npm run preview  # preview production build
node scripts/generate-bsky-digest.mjs   # run digest locally
node scripts/post-to-bsky.mjs           # post to Bluesky (needs env vars)
```

## Custom agents and commands

Defined in `.claude/agents/` and `.claude/commands/`:

- `/new-post` — scaffold a new draft blog post
- `/post-status` — show scheduled, pinned, stale, pending-bsky, and draft posts
- `/publish` — prepare a draft post for publishing
- `/bsky-digest` — run the Bluesky digest script locally
- `/hardcover-id` — look up a Hardcover book ID from its slug, for blog post frontmatter
- `blog-writer` agent — draft blog posts in Ronnie's voice
- `site-auditor` agent — audit post health and site state

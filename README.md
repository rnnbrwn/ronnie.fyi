# ronnie.fyi

Personal site at [ronnie.fyi](https://ronnie.fyi). Writing about music, technology, and whatever else. Online in some guise or other since 2001.

Built with [Astro](https://astro.build), styled with Sass, deployed to Dreamhost via GitHub Actions.

## WordPress CMS

Blog posts and the static pages (About, Uses, Changelog) are written and managed in a headless WordPress CMS (`cms.ronnie.fyi`) and fetched at build time via WPGraphQL. This site is part of a wider stack:

| Repo                                                          | Role                          |
| ------------------------------------------------------------- | ----------------------------- |
| [rnnbrwn-cms](https://github.com/rnnbrwn/rnnbrwn-cms)         | WordPress deployment pipeline |
| [rnnbrwn-themes](https://github.com/rnnbrwn/rnnbrwn-themes)   | WordPress themes              |
| [rnnbrwn-plugins](https://github.com/rnnbrwn/rnnbrwn-plugins) | WordPress plugins             |

All GraphQL queries live in `src/utils/wordpress.ts`. WordPress-sourced HTML must be wrapped in `<div class='wp-content'>` and styled with `.wp-content :global(element)` to work around Astro's scoped styles. Internal CMS links are automatically rewritten to relative URLs at build time.

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
│   │   ├── blog/           # legacy Markdown posts (no longer read; kept for rollback)
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

Posts are written in WordPress at `cms.ronnie.fyi/wp-admin` and loaded at build time by `src/loaders/wordpress-posts.ts`, an Astro content loader that reads WPGraphQL and feeds the same `blog` collection the pages have always used (`src/content.config.ts`).

| In WordPress | On the site |
| :-- | :-- |
| Title | title |
| Post URL slug | the URL, `/year/month/slug` (don't change it after publishing) |
| Publish date (or schedule) | pubDate. Scheduled posts go live when WordPress publishes them |
| Excerpt | description |
| Tags | tags |
| Featured image | feature image (size is taken from the upload) |
| Post content | the body. Start with an H2 (the title is the H1). A YouTube link on its own line becomes a responsive embed |
| **Blog Post Meta** box | Image Alt, Image Source, Pinned (+ From/Until), Stale, Post to Bluesky, Bluesky Post URI (written automatically), Hardcover IDs (comma-separated, links a post to `/shelf`) |

Only one post can be pinned: saving a pinned post unpins all but the newest (a hook in the `ronnie.fyi` theme in `rnnbrwn-themes`).

The build **fails rather than publishing an empty site** if WordPress can't be reached or returns no posts.

### Post images

Upload the image as the post's **Featured image** and fill in the alt text. Astro downloads it at build time and serves an optimised copy from ronnie.fyi. At the content width of 793px:

| Ratio | Dimensions   |
| :---- | :----------- |
| 16:9  | 793 × 446px  |
| 4:3   | 793 × 595px  |
| 1:1   | 793 × 793px  |
| 3:4   | 793 × 1057px |
| 9:16  | 793 × 1410px |

Images inside a post body that were written as `/images/…` still come from `public/images/`.

### Drafts and scheduled posts in dev

With the local WordPress running (`bash local-setup.sh --site ronnie-fyi` in `rnnbrwn-cms`), `npm run dev` also shows drafts (marked with a red **Draft** badge) and scheduled posts, and picks up edits made in the local WordPress within a few seconds. Production builds only ever see published posts.

## Bluesky auto-post

Tick **Post to Bluesky** in the post's Blog Post Meta box and the post is automatically posted to Bluesky after the next successful deploy — provided its publish date is not in the future.

The workflow (`.github/workflows/post-to-bsky.yml`) runs after the deploy workflow completes. It calls `scripts/post-to-bsky.mjs`, which:

1. Asks WordPress (WPGraphQL) for posts with **Post to Bluesky** ticked and no Bluesky Post URI
2. Skips any post scheduled for the future
3. Fetches the OG image from `https://ronnie.fyi/og/[slug].png`, uploads it to Bluesky's blob store, and posts with a link card embed
4. Writes the resulting `at://…` URI into the post's **Bluesky Post URI** field and unticks **Post to Bluesky** (through the WordPress REST API), as a permanent record and to prevent re-posting

Required GitHub secrets: `BLUESKY_USERNAME` and `BLUESKY_PASSWORD` (Bluesky app password), and `WP_APP_USER` and `WP_APP_PASSWORD` (a WordPress Application Password for that user, used for the write-back).

Posts originating from the site are excluded from the weekly digest — the digest script reads all Bluesky Post URIs from WordPress and filters them out.

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

## Rebuilds

The deploy workflow (`.github/workflows/deploy.yml`) runs on every push to `main`, on a cron schedule every 2 hours, on demand (`gh workflow run deploy.yml`), and — once switched on — when content is published in WordPress:

- **On publish (currently OFF):** the mechanism exists — saving a published post or page in WordPress asks GitHub to rebuild (via `mu-plugins/trigger-frontend-deploy.php` in `rnnbrwn-cms`), so changes would be live within a couple of minutes — but it needs a `FRONTEND_DEPLOY_TOKEN` secret in the `ronnie-fyi` GitHub Environment of `rnnbrwn-cms`. Until then, changes appear at the next 2-hourly rebuild, or run the workflow by hand.
- **Every 2 hours:** anything time-based resolves on its own — `Pinned Until` dates, and Bluesky auto-posts once a post's date passes.

## Commands

All commands are run from the root of the project:

| Command           | Action                                     |
| :---------------- | :----------------------------------------- |
| `npm install`     | Install dependencies                       |
| `npm run dev`     | Start local dev server at `localhost:4321` |
| `npm run build`   | Build production site to `./dist/`         |
| `npm run preview` | Preview production build locally           |

## Claude Code agents and slash commands

Defined in `.claude/agents/` and `.claude/commands/` (gitignored — local only).

> **Note:** `/new-post`, `/post-status`, `/publish`, `blog-writer` and `site-auditor` were written for the old Markdown workflow (posts as files in `src/data/blog/`). Posts now live in WordPress, so these need rewriting or retiring.

### Slash commands

| Command | Usage | What it does |
| :-------------- | :------------------------------------ | :----------- |
| `/new-post` | `/new-post My Post Title` | Scaffolds a new `_draft.md` with frontmatter filled in. Prompts for description and tags. |
| `/post-status` | `/post-status` | Lists all posts by state: drafts, scheduled (future-dated), pinned, pending Bluesky, stale, and recent. |
| `/publish` | `/publish slug-name` or `/publish` | Prepares a draft for publishing: strips the `_` prefix, confirms `pubDate`, optionally sets `postToBsky: true`, commits and pushes via a named branch. |
| `/bsky-digest` | `/bsky-digest` | Runs `generate-bsky-digest.mjs` locally and offers to commit the result. |
| `/hardcover-id` | `/hardcover-id book-slug` | Looks up a Hardcover book ID from its slug — useful for linking blog posts to the `/shelf` page. |
| `/audit-scss` | `/audit-scss` | Scans all SCSS for token violations, duplication, and patterns that should use existing mixins. |
| `/audit-html` | `/audit-html` | Scans all Astro templates for semantic HTML issues, unnecessary wrappers, and accessibility gaps. |
| `/dry-check` | `/dry-check` | Cross-component comparison to find repeated markup, style blocks, and prop shapes that should be shared abstractions. |

### Agents

Agents are invoked by asking Claude to use them by name, e.g. _"Use the blog-writer agent to draft a post about X."_

| Agent | Purpose |
| :------------ | :------- |
| `blog-writer` | Drafts blog posts in the site's voice. Knows the frontmatter schema, tag conventions, and writing style. Produces a complete draft ready to save. |
| `site-auditor` | Read-only audit of all posts. Reports on drafts, scheduled posts, pinned posts (including expired pins), posts pending Bluesky, and stale content. |
| `web-reviewer` | Interactive code reviewer for Astro components and SCSS. Knows the full design token system and component conventions. Use it to review specific files for weight, DRY violations, and semantic HTML. |

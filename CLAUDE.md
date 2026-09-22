# ronnie.fyi — Claude context

Personal website/blog at ronnie.fyi. Built with Astro, styled with Sass, deployed to Dreamhost via GitHub Actions rsync.

## Stack

- **Astro 6** — static site with file-based routing
- **Sass/SCSS** — 7-1 architecture (`src/styles/`)
- **Preact** — used for interactive islands (e.g. `BskyInteractors.tsx`)
- **Node ≥22.12** (see `.nvmrc`)
- **Dreamhost** — production host, deployed via rsync over SSH

## Content types

### Blog posts (WordPress)

Blog posts live in the headless WordPress at `cms.ronnie.fyi`, not in this repo. `src/loaders/wordpress-posts.ts` is an Astro content loader that reads them via WPGraphQL into the `blog` collection (schema in `src/content.config.ts`), so pages still use `getCollection('blog')` and `entry.rendered.html`.

Fields (WordPress → collection): title, slug (= `id`, URL is `/year/month/slug`), date (parsed in the runtime's timezone, like the old frontmatter dates, so URLs don't move). **WordPress' `date` is local time (Europe/London) and `dateGmt` is UTC**: `pubDate` (from `date`) is only for URLs and display; the real publish instant is `publishedAt` (from `dateGmt`) and `isPublished()` in `src/utils/getSortedPosts.ts` is the one place that decides whether a post is live yet. Never compare `pubDate` with `new Date()`: in British Summer Time it runs an hour ahead and hides a new post for an hour, excerpt → `description`, tags, featured image → `image` (`url`, `alt`, `source`, `width`, `height`), and the **Blog Post Meta** ACF group (`rnnbrwn-themes/ronnie.fyi/acf-json/group_blog_post_meta.json`): `pinned`, `pinnedFrom`, `pinnedUntil`, `stale`, `postToBsky`, `bskyPostUri`, `hardcoverIds` (comma-separated), plus `image_alt`/`image_source`. Unpublished posts have `draft: true` and only appear in dev.

- The loader **throws** on any fetch failure or zero posts, so a CMS outage fails the build instead of deploying an empty site.
- HTML post-processing in the loader: CMS links → site-relative (`/year/month/slug`), YouTube embeds → `.youtube-embed` (nocookie). Media URLs stay on `cms.ronnie.fyi`.
- Only one post can be pinned (an `acf/save_post` hook in the `ronnie.fyi` theme keeps the newest).
- `src/data/blog/*.md` is the legacy Markdown source: **no longer read**, kept temporarily for rollback.
- In dev, drafts and scheduled posts appear when `WORDPRESS_API_URL` points at the local WordPress (`rnnbrwn-cms`: `bash local-setup.sh --site ronnie-fyi`); `src/integrations/wordpress-dev-refresh.mjs` re-syncs posts when the local WordPress changes.

### Notes (`src/data/notes/*.md`)

Auto-generated weekly Bluesky digests. Schema: `title`, `pubDate`, `description` only. Files prefixed `_` are archived digests. Do not create notes manually. (Still Markdown — not in WordPress.)

## Key scripts

| Script | Purpose |
|---|---|
| `scripts/generate-bsky-digest.mjs` | Fetch recent Bluesky posts, write a digest note (skips posts the site itself posted, read from WordPress) |
| `scripts/post-to-bsky.mjs` | Post blog posts flagged "Post to Bluesky" in WordPress, then write `bsky_post_uri` back via the REST API |
| `scripts/wordpress.mjs` | Shared WPGraphQL client and REST write-back helper (needs `WP_APP_USER` / `WP_APP_PASSWORD` for writes) |

## GitHub Actions workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `deploy.yml` | Push to main + cron every 2h | Build + rsync to Dreamhost |
| `post-to-bsky.yml` | After successful deploy | Run `post-to-bsky.mjs` (records the URI back in WordPress) |
| `bsky-digest.yml` | Fridays 08:00 UTC | Run `generate-bsky-digest.mjs`, commit, trigger deploy |

Publishing or updating a post/page in WordPress can also trigger `deploy.yml` (mu-plugin in `rnnbrwn-cms`), and that is **on** (`FRONTEND_DEPLOY_TOKEN` is set in the `ronnie-fyi` GitHub Environment): a post published at 20:44:32 UTC on 2026-09-20 started a `workflow_dispatch` deploy 27 seconds later. Otherwise use the 2-hour cron or run the workflow manually (`/deploy-site ronnie.fyi`). The cron means `pinnedUntil` dates and Bluesky auto-posts resolve automatically.

## WordPress CMS (headless)

Blog posts (see above) and the static pages (About, Uses, Changelog) are fetched at build time via WPGraphQL. Page queries live in `src/utils/wordpress.ts`; the post query is in the loader. WordPress-sourced HTML must be wrapped in `<div class="wp-content">` and styled with `.wp-content :global(element)`. CMS internal links are auto-rewritten to relative URLs at build time.

Related repos: `rnnbrwn-cms` (deployment), `rnnbrwn-themes` (themes), `rnnbrwn-plugins` (plugins).

## OG images

Generated at build time via `src/pages/og/[slug].png.ts` using Satori + sharp. Only posts with both a feature image and Post to Bluesky ticked get an OG image (1200×630 PNG); the image is fetched from WordPress at build time.

## Image grouping and lightbox

A run of 3+ WordPress Image blocks in a row (or a Gallery block, which is unwrapped to the same shape first) is transformed by `src/utils/imageGroups.ts` into one full-width feature image plus a small thumbnail grid; 1-2 images are left as WordPress rendered them. `src/components/ImageLightbox.astro` is mounted once in `Base.astro` and opens on a click anywhere in a group, showing the full-size image with prev/next (buttons, arrow keys, or swipe on touch), Escape/X/backdrop-click to close, and a page-scroll lock while open. Styles live in `src/styles/components/_index.scss` nested under `.prose` — see the comment there on why the `img` overrides chain three classes (out-specificitying `img:not(...):not(...)`) rather than the more obvious two. Known gap: a single image wrapped in WordPress's Group block breaks adjacency the same as a paragraph would; only Gallery-block wrappers are unwrapped.

## Post images — standard dimensions

At content width of 793px:

| Ratio | Dimensions |
|---|---|
| 16:9 | 793 × 446px |
| 4:3 | 793 × 595px |
| 1:1 | 793 × 793px |

Upload as the post's Featured image in WordPress (with alt text); Astro downloads and optimises it at build time (`image.domains` in `astro.config.mjs`). Inline `/images/…` images in a few post bodies are served from `public/images/`.

## Dev commands

```bash
npm run dev      # dev server at localhost:4321
npm run build    # production build to ./dist/
npm run preview  # preview production build
node scripts/generate-bsky-digest.mjs   # run digest locally
node scripts/post-to-bsky.mjs           # post to Bluesky (needs BSKY_* and WP_APP_* env vars)
```

## Custom agents and commands

Defined in `.claude/agents/` and `.claude/commands/` (committed to the repo; only `settings.local.json` is local). The post commands work against WordPress over SSH (`scripts/wp-create-draft.php`, `scripts/wp-post-status.php`, credentials from `platform/rnnbrwn-cms/.env.local`):

- `/new-post` — create a draft post in WordPress (block markup, excerpt, tags)
- `/post-status` — show scheduled, pinned, stale, pending-bsky, and draft posts (read-only)
- `/publish` — publish or schedule a draft in WordPress, then rebuild the site
- `/bsky-digest` — run the Bluesky digest script locally
- `/hardcover-id` — look up a Hardcover book ID from its slug, for the post's Hardcover IDs field
- `/audit-scss` — scan all SCSS for token violations, duplication, and missed mixins
- `/audit-html` — scan all Astro templates for semantic HTML and accessibility issues
- `/dry-check` — find duplicated markup, style blocks, and prop shapes across components
- `blog-writer` agent — draft blog posts in Ronnie's voice, hands off to `/new-post`
- `site-auditor` agent — audit post health and site state from the live CMS
- `web-reviewer` agent — interactive code reviewer; knows the full design token system

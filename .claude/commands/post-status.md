Show the current status of all blog posts on ronnie.fyi, read live from the WordPress CMS (read-only).

## Get the data

One SSH connection to production, running `scripts/wp-post-status.php` (prints a JSON array of every post incl. drafts: `id, slug, title, status, date, pinned, pinned_until, stale, post_to_bsky, bsky_post_uri, has_image, has_excerpt`). SSH user/host from `../../platform/rnnbrwn-cms/.env.local` (`PROD_SSH_USER`, `PROD_SSH_HOST` only):

```bash
ssh "$USER@$HOST" "cd /home/dh_mmdugx/cms.ronnie.fyi && wp eval-file -" < scripts/wp-post-status.php
```

If the user says local, run the same script through the local WP-CLI container instead (see `/new-post`, local variant, with `eval-file -`).

Today's date: use the current date from system context. `status` values: `publish`, `future` (scheduled), `draft`, `pending`, `private`.

## Report (omit sections with no entries)

- **Drafts** — `draft`/`pending`: title, id, and what's missing (no excerpt / no featured image).
- **Scheduled** — `future`: title, slug, date. Goes live at that time; the site itself only updates on the next rebuild (every 2h, or `/deploy-site ronnie.fyi`), and WP-Cron must fire to publish it.
- **Pinned** — `pinned`: title, slug, `pinned_until` and whether it has already passed (the 2-hourly rebuild unpins visually).
- **Pending Bluesky** — `post_to_bsky` true, no `bsky_post_uri`, status `publish`: posts after the next deploy. Also flag ones that are still `future`.
- **Stale** — `stale`: title, slug.
- **Recent (last 30 days)** — published in the last 30 days.
- **Health flags** — published posts with no excerpt (empty description), or `post_to_bsky` set without a featured image (no OG card).

End with one line, e.g. "2 drafts · 0 scheduled · 0 pending Bluesky · 1 stale". Don't paste raw JSON.

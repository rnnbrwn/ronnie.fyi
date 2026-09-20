Publish (or schedule) a draft blog post on ronnie.fyi via WordPress, then make it live on the site.

Draft to publish (id or slug, optional): $ARGUMENTS

Nothing is committed to git for content any more — publishing is a WordPress status change plus a site rebuild. SSH user/host come from `../../platform/rnnbrwn-cms/.env.local` (`PROD_SSH_USER`, `PROD_SSH_HOST` only). Use ONE ssh connection per step group. WordPress path: `/home/dh_mmdugx/cms.ronnie.fyi`.

## Steps

1. **Find the draft.** If $ARGUMENTS is an id/slug: `wp post get <id|slug lookup> …`; otherwise run the `/post-status` query and list drafts, asking which one.
2. **Pre-flight, show the user** (from `wp post get <id> --fields=post_title,post_name,post_excerpt,post_date` plus `has_post_thumbnail`):
   - title, slug, excerpt present? (excerpt = the page description)
   - featured image present + alt text? (`image_alt` meta or the media alt) — required for a Bluesky OG card
   - tags present?
   Warn on gaps; let the user decide whether to continue.
3. **Date.** Ask: publish now, or schedule? For a specific time use local time `YYYY-MM-DD HH:mm:00`. The post's date fixes its URL (`/year/month/slug`), so don't change the date of an already-published post.
4. **Bluesky.** Ask "Post to Bluesky after the next deploy?" If yes, set the flag (needs the featured image for the OG card): `wp eval 'update_field("post_to_bsky", true, <id>);'`.
5. **Confirm** the exact change (post, status/date, Bluesky yes/no) — this makes something public — then apply in one connection:
   - now: `wp post update <id> --post_status=publish`
   - scheduled: `wp post update <id> --post_status=publish --post_date="YYYY-MM-DD HH:mm:00"` (WordPress turns a future date into `future` automatically; it publishes when WP-Cron next runs after that time)
   - Verify: `wp post get <id> --fields=ID,post_name,post_status,post_date --format=json` and `wp post url <id>` (or the derived `https://ronnie.fyi/YYYY/MM/<slug>`).
6. **Make it live.** Rebuild-on-publish is currently OFF, so run the `deploy-site` skill for `ronnie.fyi` (frontend) unless the user prefers to wait for the 2-hourly rebuild. For a scheduled post, the rebuild after its time is what shows it — say so. When the build finishes, curl `https://ronnie.fyi/YYYY/MM/<slug>` (expect 200) and report the URL.
7. Bluesky: the post is announced by the workflow that runs after a successful deploy (`post-to-bsky.yml`), which writes `bsky_post_uri` back to WordPress. Tell the user it appears after that run; check with `gh run list -R rnnbrwn/ronnie.fyi --workflow post-to-bsky.yml --limit 1`.

Never set `bsky_post_uri` by hand. To unpublish, set `--post_status=draft` (then rebuild).

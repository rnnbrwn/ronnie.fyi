Create a new DRAFT blog post for ronnie.fyi in WordPress (cms.ronnie.fyi). Posts live in WordPress, not in this repo.

Topic/title (optional): $ARGUMENTS

## Steps

1. Get the title from $ARGUMENTS or ask. Ask for a one-sentence description (becomes the post excerpt — no trailing period) if not given, and for tags. Suggest existing tags: list them with the query below rather than inventing new ones.
2. Make a slug from the title: lowercase, hyphens, no special characters. Check it isn't taken (`/post-status` query, or `wp post list --name=<slug> --post_status=any --field=ID`).
3. If the user gave body text or asked you to draft it, write the body as **WordPress block markup**, not Markdown:
   - paragraph: `<!-- wp:paragraph --><p>Text with <a href="…">links</a>, <em>em</em>, <strong>strong</strong>.</p><!-- /wp:paragraph -->`
   - heading (start at h2; the title is the h1): `<!-- wp:heading --><h2 class="wp-block-heading">Heading</h2><!-- /wp:heading -->`
   - list: `<!-- wp:list --><ul class="wp-block-list"><!-- wp:list-item --><li>Item</li><!-- /wp:list-item --></ul><!-- /wp:list -->` (`<ol>` for numbered)
   - quote: `<!-- wp:quote --><blockquote class="wp-block-quote"><!-- wp:paragraph --><p>Quote</p><!-- /wp:paragraph --></blockquote><!-- /wp:quote -->`
   - YouTube: `<!-- wp:embed {"url":"https://www.youtube.com/watch?v=ID","type":"video","providerNameSlug":"youtube"} --><figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube"><div class="wp-block-embed__wrapper">https://www.youtube.com/watch?v=ID</div></figure><!-- /wp:embed -->`
   If no body yet, leave `content` empty — the user will write it in the editor. Use the `blog-writer` agent for drafting in Ronnie's voice.
4. Build JSON `{title, slug, excerpt, tags: [...], content, image_alt?, hardcover_ids?}` (`hardcover_ids` = comma-separated Hardcover book IDs; see `/hardcover-id`), base64 it (`base64 | tr -d '\n'`), and create the draft with `scripts/wp-create-draft.php`:

   **Production (default)** — SSH details from `../../platform/rnnbrwn-cms/.env.local` (`PROD_SSH_USER`, `PROD_SSH_HOST`; never print other lines of that file). One connection only (Dreamhost has a low process limit):
   ```bash
   ssh "$USER@$HOST" "cd /home/dh_mmdugx/cms.ronnie.fyi && POST_B64='<base64>' wp eval-file -" < scripts/wp-create-draft.php
   ```
   **Local** (only if the user says local; the local stack must be running for ronnie-fyi — see the `local-site` skill), from `../../platform/rnnbrwn-cms`:
   ```bash
   export SITE=ronnie-fyi DB_NAME=cms_ronnie_fyi
   docker compose --env-file .env.local run --rm -T -e POST_B64='<base64>' wpcli eval-file - < ../../sites/ronnie.fyi/scripts/wp-create-draft.php
   ```
5. The script prints `{id, slug, status, edit}`. Report the edit link (`https://cms.ronnie.fyi/wp-admin/post.php?post=<id>&action=edit`) and remind the user what's still to do in the editor: featured image + alt text, tags check, then `/publish`.

Drafts are private and never appear on the live site (only in local dev). Creating one does not trigger a rebuild.

Do not set Bluesky, pinned or stale fields at creation; `/publish` handles `post_to_bsky`. Never set `bsky_post_uri` — the post-to-bsky script writes it.

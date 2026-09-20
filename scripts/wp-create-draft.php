<?php
// Creates a DRAFT blog post. Run through WP-CLI: `wp eval-file - < scripts/wp-create-draft.php`
// with POST_B64 set to base64-encoded JSON: {title, slug, excerpt, tags[], content (block markup),
// image_alt?, hardcover_ids?}. Prints the new post ID as JSON. Never publishes.
$d = json_decode(base64_decode(getenv('POST_B64') ?: ''), true);
if (!is_array($d) || empty($d['title'])) { fwrite(STDERR, "POST_B64 missing or invalid\n"); exit(1); }

$id = wp_insert_post([
  'post_type'    => 'post',
  'post_status'  => 'draft',
  'post_title'   => $d['title'],
  'post_name'    => $d['slug'] ?? '',
  'post_excerpt' => $d['excerpt'] ?? '',
  'post_content' => $d['content'] ?? '',
  'tags_input'   => $d['tags'] ?? [],
], true);
if (is_wp_error($id)) { fwrite(STDERR, $id->get_error_message() . "\n"); exit(1); }

foreach (['image_alt', 'hardcover_ids'] as $k) {
  if (!empty($d[$k])) update_post_meta($id, $k, $d[$k]);
}
$p = get_post($id);
echo wp_json_encode(['id' => $id, 'slug' => $p->post_name, 'status' => $p->post_status, 'edit' => admin_url("post.php?post=$id&action=edit")]);

Look up a Hardcover book ID from its URL slug, for a blog post's **Hardcover IDs** field in WordPress.

The user will provide a book slug or search term (the last part of a Hardcover URL, e.g. `muybridge` from `https://hardcover.app/books/muybridge`). If they haven't provided one, ask for it.

## Steps

1. Run the script, substituting the term:
```bash
node --env-file=.env scripts/hardcover-id.mjs <search-term>
```

2. Report the result:
   - Show the book title to confirm it's the right book
   - Show the numeric ID ready to paste
   - If no book was found, say so and suggest checking the slug

## Usage

In WordPress, add the ID to the post's **Blog Post Meta → Hardcover IDs** field. It's a comma-separated list, so several books work: `2126459,365489`. This links the post to the book(s) on the /shelf page. To set it from here instead: `wp eval 'update_field("hardcover_ids", "12345,67890", <post id>);'` on the CMS (see the `prod-wp` skill).

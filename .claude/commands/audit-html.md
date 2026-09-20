Scan all Astro component and page templates for semantic HTML issues, unnecessary markup, and accessibility gaps. Report a prioritised list of findings.

## What to scan

- All `.astro` files in `src/components/`
- All `.astro` files in `src/pages/` (excluding generated/dynamic pages like `og/[slug].png.ts`)
- All `.tsx` files in `src/components/` (Preact islands)

Focus on the template/JSX sections only — not the frontmatter or `<script>` blocks.

## What to look for

### Semantic HTML
- `<div>` or `<span>` where a more meaningful element fits:
  - `<section>` — thematically grouped content with a heading
  - `<article>` — self-contained content (post, card)
  - `<aside>` — supplementary content
  - `<nav>` — navigation landmark
  - `<header>` / `<footer>` — page or section header/footer
  - `<main>` — primary content area
  - `<figure>` / `<figcaption>` — images with captions
  - `<time>` — dates and times (with `datetime` attribute)
  - `<address>` — contact info
- `<b>` where `<strong>` is correct (importance), `<i>` where `<em>` is correct (emphasis)
- `<br>` used for spacing rather than paragraph breaks

### Heading structure
- Multiple `<h1>` elements on a page
- Heading levels that skip (e.g. `<h1>` directly followed by `<h3>`)
- Headings used purely for visual styling (should be a `<p>` with a class)

### Unnecessary elements
- Wrapper elements (`<div>`, `<span>`) with a single child and no class, id, or attribute — they add no value
- Empty elements with no content or purpose
- Redundant wrapping (e.g. `<ul>` inside a `<div>` where the `<ul>` itself could take the styles)

### Accessibility
- `<img>` without `alt` attribute (decorative images should have `alt=""`)
- `<button>` elements with no visible text or `aria-label`
- `<a>` elements with non-descriptive text ("click here", "read more", "here")
- `<a>` elements used as buttons (no `href`, or `href="#"`) — should be `<button>`
- Interactive elements missing `:focus-visible` styles (check if the `focus-ring` mixin is applied)
- Icon-only buttons/links missing `aria-label` or `aria-hidden` on the icon

### Links
- `<button>` elements used for navigation (should be `<a>`)
- External links missing `rel="noopener noreferrer"` when using `target="_blank"`

## Report format

Group findings by severity:

**High** — accessibility failures (missing alt, unlabelled interactive elements)
**Medium** — semantic errors (wrong element, heading skip, div where article fits)
**Low** — unnecessary wrappers, minor improvements

For each finding, include:
- File name
- The element or pattern
- Why it's an issue
- Suggested fix

End with a short summary: total issues by severity, and the highest-priority single fix.

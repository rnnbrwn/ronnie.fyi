Compare components and styles across the codebase to identify duplication that could be extracted into shared abstractions. Report a prioritised list of DRY violations.

## What to scan

- All `.astro` files in `src/components/` and `src/pages/`
- All `.tsx` files in `src/components/`
- All `<style lang='scss'>` blocks within those files
- `src/styles/` for any abstractions already in place that aren't being used consistently

## What to look for

### Duplicated SCSS patterns
Look for sets of 3+ CSS declarations that appear identically or near-identically in 2+ component style blocks. Common candidates:
- Button reset patterns (`background: none; border: none; cursor: pointer; padding: 0`)
- Link styling (`text-decoration: underline; text-decoration-style: dotted`)
- Text truncation (`display: -webkit-box; -webkit-line-clamp: N; -webkit-box-orient: vertical; overflow: hidden`)
- Dark mode overrides that repeat the same color swaps
- Font property groups (`font-family`, `font-size`, `font-weight` always together)

For each, check whether an existing mixin in `src/styles/abstracts/` already covers it. If so, flag that the mixin isn't being used. If not, suggest a new mixin with a name that fits the existing naming conventions.

### Duplicated markup patterns
Look for Astro/JSX template fragments that appear in 2+ files with only minor differences (e.g. different data, but same structure). These are candidates for a shared component. Examples to watch for:
- Badge/tag elements with the same visual treatment
- Link patterns with the same classes and modifiers
- Metadata displays (date, author, reading time)

### Duplicated TypeScript props / interfaces
Look for prop interfaces or type definitions that share 4+ identical fields across components. Suggest a shared type in `src/utils/` or a `types.ts` file.

### Existing abstractions used inconsistently
Check whether components that should use existing mixins are instead replicating the declarations by hand. For example:
- A component that writes out `list-style: none; padding: 0` instead of `@include layout.list-reset`
- A component that specifies `focus` styles instead of using `layout.focus-ring`
- A component using raw color values instead of the token maps

## Report format

Group findings by type:

**SCSS patterns** — repeated style blocks that should be a mixin
**Markup patterns** — repeated template fragments that should be a component
**TypeScript** — repeated prop shapes that should be a shared type
**Unused abstractions** — existing mixins/tokens not being used where they should be

For each finding, include:
- Which files contain the duplication
- The repeated pattern (abbreviated if long)
- Whether an existing abstraction already covers it, or what new one to create
- Suggested fix or next step

End with a priority-ordered list of the top 3 changes that would eliminate the most duplication with the least effort.

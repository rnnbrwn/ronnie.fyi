Scan the project's SCSS for weight, duplication, and token usage issues. Report a prioritised list of findings.

## What to scan

1. All files in `src/styles/` (the 7-1 architecture)
2. All `<style lang='scss'>` blocks inside `src/components/*.astro` and `src/pages/*.astro`

## What to look for

### Token violations — flag raw values that have a design token
- Raw color values (`#xxx`, `rgb()`, `rgba()`) that match or approximate a token in `src/styles/abstracts/_colors.scss`
- Raw spacing values (`px`, `rem`) that match the spacing scale in `_spacing.scss` ($space-1 = 4px/0.25rem through $space-32 = 128px/8rem)
- Raw font-size values that match the type scale in `_typography.scss` ($font-size-sm = 0.563rem through $font-size-6xl)
- Hardcoded font families instead of `$font-heading`, `$font-body`, or `$font-mono`
- Hardcoded font weights instead of `$weight-*` variables

### Duplication — flag patterns repeated across 2+ files
- Identical or near-identical declaration blocks (e.g. the same 4-5 properties appearing in multiple component `<style>` blocks)
- Patterns that match an existing mixin: `focus-ring`, `body-link`, `body-link-on-dark`, `list-reset`, `h1-saffron-underlay`, `caption-text`, `body-text`, `heading-base`, `prose`
- Repeated dark mode blocks with the same overrides

### Unnecessary complexity
- Nesting deeper than 3 levels
- `@extend` usage (prefer mixins — extends can produce bloated output)
- Selectors that could be simplified (e.g. `.parent .parent .child` when `.child` alone would scope correctly in Astro)

### Outdated patterns
- Vendor prefixes that have broad support and no longer need the prefix (check: `-moz-`, `-ms-`, `-o-`)
- Note: `-webkit-line-clamp` pattern (with `display: -webkit-box` and `-webkit-box-orient: vertical`) is still required for multi-line truncation — do NOT flag this

## Report format

Group findings by severity:

**High** — token violations or significant duplication (affects output size or maintainability)
**Medium** — unnecessary complexity or patterns that should use an existing mixin
**Low** — minor style inconsistencies, nitpicks

For each finding, include:
- File and approximate location (class name or line context)
- What the issue is
- Suggested fix (show the corrected code where practical)

End with a short summary: total issues by severity, and the one change that would have the most impact.

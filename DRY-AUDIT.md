# DRY Audit

## High

### 1. Breakpoint `768px` hardcoded 6×
`Navigation.astro`, `Footer.astro`, `Post.astro`, `Base.astro`, `_typography.scss`, `base/_index.scss`. Should be a variable, e.g. `$breakpoint-md: 768px` in a new `_breakpoints.scss`.

### 2. Breakpoint `1400px` repeated 3× in `[slug].astro`
All within the same file's style block. A local `$post-layout-breakpoint` variable would do.

---

## Medium

### 3. Focus ring styles duplicated
`Base.astro` and `Navigation.astro` each define their own `outline`/`box-shadow` focus styles with slight variations. A `@mixin focus-ring` would centralise this.

### 4. `box-shadow: 2px 2px 4px rgba(0,0,0,0.35)` hardcoded
In `_index.scss:326`. Should be a named variable in `_colors.scss`.

### 5. Border radius values `8px` and `4px` scattered
Across `_index.scss`. Could be `$radius-sm` / `$radius-md` tokens.

### 6. `color: colors.$tertiary` + visited + hover pattern repeats ~39 times
A `@mixin tertiary-link` would encapsulate the full pattern including dark mode variants.

---

## Low

### 7. Hardcoded pixel values for decorative transforms
`rotate` and `translateY` values in `Post.astro` and `index.astro`. Acceptable as one-offs.

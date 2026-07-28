# Aurora Typography Match + Font Preloading

**Date:** 2026-07-29
**Status:** Implemented and verified

## Goal

Match the typography of the Aurora template (`brandivibe.com/aurora`) and make
sure the fonts are preloaded.

## What Aurora actually uses

Read from source, not inferred from the rendered CSS —
`H:\VS Code File\brandivibe\mjstudio\src\app\(frontend)\aurora\layout.tsx`:

```ts
import { Playfair_Display, Manrope } from "next/font/google";
```

| Role | Family | Weights |
| --- | --- | --- |
| Display | **Playfair Display** | 400–800, normal + italic |
| Body | **Manrope** | 300–600 |

Background: `--aurora-bg: #07060a` — near-black, the same territory as
Pureweight's `#030303`, so Playfair is proven to work on this kind of ground.

> A first pass at the rendered CSS also showed **Fraunces**, **Geist** and
> **Geist Mono**. Those come from the parent `(frontend)/layout.tsx` — the
> brandivibe site chrome — not from Aurora itself. Reading the route's own
> layout was what separated the two.

## Decision

**Body needed no change.** Pureweight already used Manrope. Only the display
serif differed: Cormorant Garamond → **Playfair Display**.

### The consequence that made this a real decision

Playfair ships **no 300 weight**, and it is a high-contrast transitional — its
thin strokes are the first thing to disappear on a near-black ground. The
Pureweight layout was tuned around Cormorant at weight 300.

So the swap necessarily included raising display type from 300 → 400. All 37
`font-light` classes in the codebase sat on display type and became
`font-normal`; the base `h1–h4` rule moved to `font-weight: 400`.

**Headlines now read heavier and more theatrical.** That is the Aurora
character, and it was accepted deliberately — not a regression.

Options considered and rejected:

- *Keep Cormorant* — would have ignored the actual request.
- *Playfair headings + Cormorant italic accents* — costs a third family, and
  two serifs this close in feel read as indecision rather than as a system.

## The preload bug

Pureweight was emitting **zero** font preload links. Aurora emits six.

Root cause found by inspecting `next-font-manifest.json`:

```
webpack build   → app routes with fonts: 0   → no preload links
turbopack build → app routes with fonts: 7   → 3 preload links
```

`next/font`'s automatic preloading depends on that manifest, and the webpack
build was not populating it. The fonts still *loaded* — the `@font-face` rules
were in the stylesheet — but with no preload they were only discovered once the
CSS had been parsed, costing time on an LCP that is a text headline.

**Fix:** `next build --turbopack` (and `next dev --turbopack`). Turbopack is the
stable, recommended build path in Next 15.5, so this is not a workaround.

Confirmation the match is exact — the emitted font hashes are byte-identical to
Aurora's, because they are the same families and subsets:

```
/_next/static/media/2a65768255d6b625-s.p.*.woff2   (also preloaded by Aurora)
/_next/static/media/70e3db2de7f94926-s.p.*.woff2   (also preloaded by Aurora)
/_next/static/media/a343f882a40d2cc9-s.p.*.woff2
```

### Cost accepted

| Route | Webpack | Turbopack | Δ |
| --- | --- | --- | --- |
| `/` | 189 kB | 207 kB | +18 kB |
| `/contact`, `/faq`, `/legal/*` | 111 kB | 179 kB | +68 kB |
| `/request-a-valuation` | 131 kB | 200 kB | +69 kB |

~13 kB of that is accounting rather than payload — Turbopack counts the CSS
chunk inside the shared total and webpack did not.

Judged worth it: the homepage is the entry point, its LCP element is text, and
preloading ~101 kB of font ahead of CSS parse is a larger win than the ~5 kB of
real added JS there. Secondary pages pay more but are rarely the landing page.

**Revisit if** Next fixes manifest population under webpack, or if the secondary
pages start being used as campaign landing pages.

## Verification

- 3 `<link rel="preload" as="font">` served, all resolving 200 (38 kB / 38 kB / 24 kB)
- `--font-display: var(--font-playfair), "Playfair Display", Georgia, serif`
- Only Playfair Display and Manrope `@font-face` blocks ship — Cormorant gone
- Zero `font-light` remaining; 78 `font-normal`
- `npm run verify` green: typecheck, lint, geometry 13/13, contrast all-pass, budget within

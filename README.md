# Pureweight Gold Exchange

An immersive WebGL brand experience for a premium gold exchange and
precious-metal valuation service.

**Concept:** *True value is established through balance, purity and precision.*

The balance scale is not decoration. A single value — `scrollState.balance` —
runs 0 → 1 across the four valuation stages and simultaneously drives the tilt
of the 3D beam, the needle on the process indicator, and the `--beam-tilt`
custom property that every hairline rule on the page is rotated by. The object
and the layout come level together, exactly as the visitor finishes reading
"Complete the Exchange". The animation *is* the business story.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
npm run verify       # typecheck + lint + geometry audit
```

Node 20+. Node 24 is required for `npm run check:geometry` (native TS stripping).

---

## Stack

Next.js 15 (App Router, **Turbopack**) · React 19 · TypeScript ·
React Three Fiber 9 · drei 10 · three r170 · GSAP ScrollTrigger · Lenis ·
Tailwind CSS v4 · Zod

## Typography

Four faces, each with one job.

| Face | Role |
| --- | --- |
| **Rye** 400 | Upright display — Victorian slab, matched to the logo |
| **Playfair Display** italic | Accent counterpoint only |
| **Manrope** | Body, navigation, forms |
| **Geist Mono** 500 | Micro-labels at 10px / 0.42em tracking |

**Why Rye.** The supplied logo sets PUREWEIGHT in a heavy Victorian display
serif — blunt flared serifs, high stroke contrast, engraved-label character.
Rye is a genuine Victorian slab/Tuscan and is the closest letterform match
among the free candidates. It was chosen by eye from a specimen page that
rendered every candidate at real display size directly beneath the actual mark;
Cinzel matched the *feeling* (inscriptional, struck-into-metal) but its fine
tapered serifs were the wrong shape, and Yeseva One read as hand-painted
signwriting.

**Rye ships exactly one weight: 400** — and it is already heavy by design.
Nothing may set a heavier weight on display type: the browser would synthesize
a faux-bold and the letterforms turn to mush. `font-synthesis: none` on
`h1–h4` is the hard stop, so even a stray `font-weight: 600` renders as true
400 rather than as smeared type.

**Why Playfair is still here.** No vintage display face on Google Fonts ships an
italic, and this design uses italic serif accents in 21 places. Rather than lose
them, the italic counterpoint stays calligraphic via `.accent-italic`. An
engraved roman against a calligraphic italic is a pairing, not an accident.

> **The build must be Turbopack.** `next/font`'s automatic preloading depends on
> `next-font-manifest.json`, and the webpack build populates it with *zero* route
> entries — so the site ships no font preload links at all. See
> [docs/plans/2026-07-29-aurora-typography-design.md](docs/plans/2026-07-29-aurora-typography-design.md).

---

## Performance

| | |
| --- | --- |
| Homepage First Load JS | **212 kB** |
| Shared baseline | 196 kB |
| 3D layer | **0 bytes until requested** |

three.js, R3F and drei are reachable only through
`src/components/webgl/canvases.tsx`, imported exclusively via `next/dynamic`
with `ssr: false`. The hero headline, the navigation and the primary CTA are
parsed, painted and clickable before a byte of WebGL is fetched.

Every scene mounts through `SceneShell`, which guarantees:

1. **Never blocks.** The poster is inline SVG in the first HTML payload; the
   canvas fades in over it. No blank frame, no layout shift.
2. **Never renders unseen.** Off-screen or backgrounded, `frameloop` is `never`
   — stopped, not throttled.
3. **Never fails loudly.** An error boundary *and* a `webglcontextlost` listener
   both fall back to the poster with a plain-language line.
4. **Never overreaches.** Devices reporting as weak, data-saving or
   software-rendered get the poster permanently.
5. **Never leaks.** Shared geometry, materials and textures are
   reference-counted across the three scenes and disposed with the last one.

Quality adapts from measured frame timing (drei `PerformanceMonitor`), not from
device sniffing — a flagship phone in a warm pocket is a mid-range phone.

| Tier | DPR cap | Shadows | Particles | Chain physics |
| --- | --- | --- | --- | --- |
| high | 1.75 | ✅ 1024px | 140 | ✅ |
| medium | 1.5 | ✅ 512px | 60 | ✅ |
| low | 1.0 | ❌ (contact shadow) | 0 | ❌ |
| none | — | poster only | — | — |

---

## Accessibility

The site is fully usable with **no WebGL, no JavaScript, and no motion.**

- **Reveals fail open.** `.will-reveal` defaults to *visible*. A blocking script
  in `<head>` hides them only after confirming JS is running and motion is
  wanted — and a 3-second watchdog un-hides everything if hydration never
  completes. Content is never permanently hidden by a broken script.
- **Reduced motion** removes Lenis entirely (native scroll), stills the scale in
  its **balanced** position, drops particles, chain physics, camera travel,
  parallax and magnetic buttons. Every word survives.
- Canvases are `aria-hidden`; nothing lives inside them that is not also in the
  HTML.
- **Contrast is measured, not assumed.** `npm run check:contrast` composites
  every text token against all six section surfaces and asserts WCAG AA. It
  found ten failing tokens on the first run — the worst at **2.26:1** against a
  4.5 requirement — all from dimming muted grey and gold with opacity. Alpha is
  now gone from every text colour; the only remaining dimmed token is
  `gold-antique/75`, used solely on oversized display numerals where the 3:1
  large-text threshold applies (it measures 3.63:1). Tightest normal-text
  margin is 5.50:1.
- Touch targets are ≥44px on every standalone control, including the
  navigation CTA and the section CTAs, which were ~32px and ~17px before audit.
- Skip link, one `<h1>` per page, semantic landmarks, focus-trapped mobile menu
  that restores focus, gold focus rings, `aria-current` on the active route.
- UI icons are inline SVG, never glyphs — a fullwidth `＋` renders at CJK width
  in Latin fonts and its weight varies by platform.
- The **scene cursor** (a thin gold ring with an "Explore" / "Inspect" label) is
  scoped to the three WebGL rectangles only — fine pointers, no reduced motion,
  and suppressed over every real control and marked copy block. A custom cursor
  that follows you across a whole site makes every ordinary click feel slightly
  wrong; if the component never mounts, nothing about the page changes.
- Form: one `<fieldset>`/`<legend>` per step, an error summary that takes focus
  and links to each field, `aria-invalid` + `aria-describedby` throughout, live
  regions for step changes and upload progress.
- Pinch-zoom is **not** disabled.

---

## Content integrity

This site is for a business that handles other people's valuables, so no
statement about it is invented. That is enforced structurally:

```ts
type Verifiable<T> =
  | { status: 'verified';    value: T }
  | { status: 'placeholder'; label: string }
```

Unverified fields can only reach the page through `<Fact>`, which renders a
visible marked slot. There is no code path that prints an unconfirmed value as
fact. `LocalBusiness` JSON-LD is emitted **only** when the minimum verified set
exists — otherwise the page ships none.

Not built, deliberately: live gold rates, a valuation calculator, trust badges,
founding dates, testimonials, turnaround times, fees, guarantees.

See **[CONTENT-PLACEHOLDERS.md](CONTENT-PLACEHOLDERS.md)** for the full
outstanding list. **The client's actual logo file is item #1** — the marks
currently in the build are an original interpretation of its written
description.

---

## The enquiry form — read this before launch

`POST /api/valuation` validates, rate-limits (5/hour/IP) and packages an
enquiry, then hands it to whatever delivery mechanism is configured.

**In production with nothing configured, it returns `503` and tells the visitor
to phone instead.** It deliberately does *not* accept the submission and show a
success screen.

This is the most important decision in the file. A form that reports success
while writing to a log nobody reads fails *silently*, and the person who loses
out is someone who was about to bring in inherited gold and now believes they
are waiting for a callback that will never come. Better a visible error and a
phone number than a polite lie.

To go live, set:

```bash
VALUATION_WEBHOOK_URL=https://…      # Zapier / Make / n8n / CRM intake / your API
VALUATION_WEBHOOK_SECRET=…           # optional; sent as a Bearer token
NEXT_PUBLIC_SITE_URL=https://www.…   # canonicals, OG, sitemap
```

…or replace `deliver()` in the route with a direct provider call (Resend,
Postmark, SES, a database write).

**Image bytes are not forwarded.** Metadata travels so the business knows
photographs exist and can ask for them. Wire up object storage (S3/R2/
UploadThing) and attach the resulting URLs when the client picks one.

Anti-spam is a honeypot field plus a submit-timing floor — no CAPTCHA, so no
puzzle, no third-party script and no accessibility barrier.

### Verified behaviour

| Case | Result |
| --- | --- |
| `GET` | `405` |
| Missing name/email | `422` + field errors |
| Invalid email | `422` + a message that says what to do |
| Honeypot filled | `400`, reason not disclosed |
| Submitted under 3s | `400`, reason not disclosed |
| Non-image upload | `415` naming the file |
| 6th enquiry in an hour | `429` + `Retry-After` |
| "Call me" with no phone number | `422` — cross-field rule, enforced server-side |
| Valid, webhook configured | `200` + reference `PW-XXX-XXX` |
| Valid, nothing configured | `503` — refuses rather than faking success |

Service panels link in with the item type pre-selected
(`/request-a-valuation?item=bullion`), validated against the allowed set rather
than trusted, so a hand-edited URL cannot inject a value into the enquiry.

---

## Automated audits

```bash
npm run verify          # typecheck + lint + geometry + contrast
npm run check:geometry  # nothing in the 3D scene intersects
npm run check:contrast  # every text token clears WCAG AA on every surface
```

Both exist because both caught real defects that reading the code did not.

The scale is assembled from numbers, not dragged into place in a viewport, so
`scripts/check-geometry.mjs` loads the real geometry and measures it: does the
fulcrum apex meet the pivot, does the pointer clear the column's turned collar,
does the pointer tip actually reach the tick arc, do the pans clear the plinth,
does the cargo clear the beam.

It has already earned itself — it caught the graduation plate and pointer
intersecting the column's collar (radius 0.206 at exactly that height), which is
why they now sit at `z = 0.26` and `z = 0.31` with visible mounting hardware.

---

## Structure

```
src/
  app/                     routes, metadata, sitemap, robots, API
  components/
    brand/Marks.tsx        emblem · wordmark · monogram · beam rule
    chrome/                nav · footer · loader
    form/                  six-step valuation enquiry
    motion/                Lenis + ScrollTrigger, writes the scroll store
    sections/              the twelve homepage sections
    ui/primitives.tsx      Fact, Placeholder, CTA, Section, BeamDivider
    webgl/
      geometry.ts          lathe profiles, extruded outlines, ingots
      textures.ts          procedural scratch, iron, filigree, hallmark maps
      materials.ts         two metals: gold reflects, iron absorbs
      Studio.tsx           the lighting rig
      BalanceScale.tsx     the instrument
      HeroScene / AssayScene / FinaleScene
      SceneShell.tsx       gating, fallback, disposal
      ScalePoster.tsx      the inline-SVG static hero
  lib/
    site.ts                content + the verification guard
    scroll-store.ts        per-frame state, zero re-renders
    capability.ts          GPU / motion / data-saver tiering
```

---

## Pages

| Route | Indexed | Notes |
| --- | --- | --- |
| `/` | ✅ | The full twelve-section experience |
| `/request-a-valuation` | ✅ | Accepts `?item=` / `?appointment=` prefill |
| `/faq` | ✅ | `FAQPage` schema, built from answered questions only |
| `/contact` | ✅ | |
| `/insights` | ❌ noindex | Topics planned, articles unwritten |
| `/legal/{privacy,terms,cookies,accessibility}` | ❌ noindex | Structured shells |
| `/opengraph-image` | — | Generated 1200×630 PNG share card |

`robots.txt` blocks only `/api/`. The noindex pages are deliberately left
crawlable: blocking them in robots.txt would mean the crawler never sees the
noindex, and the URL could still surface as a bare, untitled link. *Disallow*
blocks crawling; *noindex* blocks indexing. Wanting the second means permitting
the first.

Not built: per-service pages (Sell Gold, Buy Gold, etc.). The brief says to
create pages only for confirmed services, and none are confirmed yet. "How It
Works" and "About" are homepage anchors rather than standalone routes — the
content is shallow enough that splitting it would weaken both.

---

## Known limitations

- **The 3D scene has been verified numerically and by build, not visually.** The
  geometry audit confirms nothing intersects and every part is where it should
  be; material response and the final lighting balance should be reviewed in a
  browser and tuned against the client's taste.
- Rate limiting is in-memory — move to Redis before scaling horizontally.
- Uploaded images are validated then discarded pending a storage decision.
- Service panels use ornamental plates, not photography.

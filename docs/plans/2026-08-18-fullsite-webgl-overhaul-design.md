# Full-site WebGL overhaul — design

Agreed 2026-08-18 with the owner, three forks decided explicitly:

1. **WebGL architecture: WINDOWED SCENES.** 3D lives inside deliberate,
   section-scoped frames mounted through SceneShell, on OPAQUE page surfaces.
   No full-viewport backdrop canvas anywhere: measured cost of one under this
   site's translucent surfaces is ~43fps regardless of scene content
   (scripts/check-perf.mjs header carries the numbers). The persistent-world
   experiment (webgl/world/) is the parts bin — its mass, lighting and camera
   get reused inside windows; the world itself stays unmounted.
2. **Unverified business facts: HIDDEN from visitors.** `<Fact>` gains a
   visitor mode rendering nothing for unverified fields; sections with zero
   verified content collapse. The Keeper keeps showing every gap. Placeholder
   chips survive only inside the Keeper. Nothing is ever invented — the
   Verifiable<T> rule is untouched.
3. **Typography: INSTITUTIONAL PREMIUM.** Manrope leads — large, tight
   editorial headlines; Geist Mono tracked labels; tabular numerals for every
   weight and price. Rye survives only inside the logo mark. Playfair demoted
   to rare accents. Palette per the creative brief §5: ~90% neutral
   (#070707→#151516, #F4F2EC, #9B9890, hairlines rgba(255,255,255,0.08)),
   gold (#B98B3C/#D2AD61/#92702E/#E3C77F) reserved for value moments and
   interactive states.

## Phases

0. **Clean base** — apply confirmed findings from the two adversarial bug
   hunts (WebGL + full-site), plus the queued fixes: shared-refcount
   retain/render ordering, shared-material mutation, mass initial-position
   drift, webglcontextrestored handling.
1. **Design system** — tokens, type scale, spacing rhythm, opaque surfaces
   (retire --surface-alpha), button/card/form language: flat, 1px borders,
   1–2px hover movement, no glow.
2. **WebGL windows** — FireflyBackdrop retired site-wide (same compositing
   bill on every page, invisible behind opaque surfaces anyway). Kept scenes:
   assay, finale. New: a windowed specimen scene reusing GoldMass +
   WorldLighting materials. All scenes: capability tiers, posters,
   reduced-motion stills, payload gate.
3. **Motion** — attack the ~12s of scroll long-tasks by measurement; Lenis is
   the prime suspect and is removed or tamed on check:perf evidence, not
   sentiment. Reveals become mask/clip, ≤12px travel, no content invisible
   without JS.
4. **Homepage recomposition** on the new system. **CHECKPOINT: owner visual
   review before subpages.**
5. **Subpages** — what-we-buy, how-it-works, purity-and-weight, about,
   contact, faq, insights, legal, 404 onto the same system. Keeper untouched.
6. **Final review** — full visual + functional pass, live screenshots both
   widths.

## Acceptance per phase

- npm run verify && verify:built (types, lint, geometry, contrast, budgets, axe)
- npm run check:scene-contrast — re-measured against opaque surfaces
- npm run check:perf — target ≥50fps mean on the dev machine, no long-task storm
- npm run check:3d-payload — data-saver visitors never download the renderer
- npm run shot:live / shot:world — looked at, both widths, before "done"

## Standing constraints

- No binary 3D assets; procedural, deterministic geometry only.
- No invented business facts, ever (Verifiable<T> guards this structurally).
- Indexing stays off until CONTENT-PLACEHOLDERS.md clears.
- The repo is public; nothing sensitive in code or commits.

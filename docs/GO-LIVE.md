# Go-Live Runbook

The preview at `pureweightofficial.github.io/pw` is deliberately a **noindex
demo**. This is the ordered checklist for turning the project into the real
site. Items are sequenced — several silently depend on earlier ones.

## 1. Content (blocks everything else)

Work through [CONTENT-PLACEHOLDERS.md](../CONTENT-PLACEHOLDERS.md). Nothing
below matters while the site says `[INSERT CONFIRMED TRADING ADDRESS]`.

## 2. Choose the host

| | Enquiry form works | Immutable caching + brotli | Security headers |
| --- | --- | --- | --- |
| **Node host (Vercel Pro / Cloudflare / VPS)** | ✅ | ✅ | ✅ full set incl. CSP |
| **GitHub Pages** | ❌ visible "disabled" notice | ❌ 10-min cache, gzip only | meta-CSP only, no frame-ancestors |

GitHub Pages is a preview surface, not a production host. The audit measured
its `Cache-Control: max-age=600` on content-hashed assets — every returning
visitor re-downloads the full bundle.

## 3. The basePath trap (custom domains)

`/pw` exists **only because** the preview lives at `*.github.io/pw`. A custom
domain serves from the origin root — deploying there with `/pw` still set 404s
every asset on the site.

- **Node host:** nothing to do; basePath is never applied.
- **Pages + custom domain:** set `BASE_PATH: ''` in the workflow env (it
  overrides the `/pw` default), and add the `CNAME` file.

## 4. Environment, per deployment

```bash
NEXT_PUBLIC_SITE_URL=https://www.the-real-domain.com   # canonicals, OG, sitemap
VALUATION_WEBHOOK_URL=...    # REQUIRED on node — the API 503s without it, by design
VALUATION_WEBHOOK_SECRET=... # optional bearer token for the receiver
NEXT_PUBLIC_ALLOW_INDEXING=true   # ONLY after step 1 is complete — this is the
                                  # switch that lets search engines in
```

## 4b. Manual gate — hero film contrast

`npm run verify` **cannot** check this one, and that is not an oversight: the
hero's backdrop is a moving image, and the check needs ffmpeg to decode it.
ffmpeg is not a project dependency, so this stays a deliberate manual step
rather than a silent skip inside `verify`.

Re-run it whenever **the film is re-cut or the `.hero-scrim` / `.hero-media`
values change**:

```bash
npm i --no-save ffmpeg-static
node_modules/ffmpeg-static/ffmpeg.exe -i public/video/hero-atmosphere.mp4 \
  -vf "fps=4,scale=320:180" -pix_fmt rgb24 -f rawvideo frames.raw -y
node scripts/check-hero-contrast.mjs frames.raw   # exits non-zero on failure
```

It samples every frame, composites the real scrim over the real pixels, and
reports the worst ratio the hero copy can meet. It parses the scrim stops and
film dim out of `globals.css`, so it cannot drift from what ships.

Why it matters: the film peaks at `rgb(247,231,171)` — brighter than the ivory
text over it. Undimmed and unscrimmed, the lead paragraph measures **3.33:1** and
the headline **2.08:1**, both failing WCAG AA. The shipped values put them at
8.21:1 and 4.64:1. Those margins are not large enough to survive an unmeasured
change.

## 4c. Manual gate — section 3D scene contrast

The ambient scenes render BETWEEN a section's opaque surface and its copy, so
text sits on lit metal under a moving key light. `npm run verify` cannot see it
and neither can any static analysis — a specular highlight can travel anywhere in
the frame.

Re-run whenever a scene, the `.section-scene-scrim`, or a type colour changes:

```bash
npm run build
npm i --no-save playwright-core
npm run check:scene-contrast     # exits non-zero on failure
```

It serves the build, scrolls each scened section into view, hides the copy so the
true backdrop is exposed, screenshots, and composites the real type colours from
`globals.css` against the brightest pixel found.

Current margins, worst first: `#appointment` 5.35:1 lead, `#journey` 6.43:1,
everything else above 6.8. Threshold is 4.5:1.

**Read the failures carefully before changing any design.** This gate produced
three false alarms while being written, all of them sampling bugs rather than
contrast problems: the fixed navigation overlaying the section, decorative gold
ornaments that are legitimately aria-hidden, and a clip box that ran past the
section into the next one. A reported failure of ~1.0:1 almost certainly means
the sample is catching something the copy never sits on.

## 4d. Manual gate — 3D payload on data-saving devices

`capability.ts` rates a device advertising Data Saver or a 2g/3g connection as
tier `"none"` and renders a poster instead of a scene. For a long time it did so
*after* downloading the renderer: the capability probe lived inside `SceneShell`,
past the `next/dynamic` boundary, so the phone had to fetch ~600KB of three.js in
order to learn it should not use it. Measured before the fix, a capable desktop
and a 2g + Data Saver phone pulled **byte-identical** payloads.

The decision now happens in `lib/scene-gate` before the dynamic import, and every
canvas call site consults it. That is one careless import away from silently
reverting — nothing on screen would change — so it is measured:

```bash
npm run build
npm run check:3d-payload         # exits non-zero on failure
```

Current result: capable desktop 1594kB of JS with scenes; 2g + Data Saver 637kB
with none. **957kB avoided**, ~238kB of it gzipped.

**Run this on a machine with a real GPU.** It is deliberately not in CI: a runner
falls back to SwiftShader, which `capability.ts` correctly rates tier `"none"`,
so *both* profiles would skip the renderer and the gate would pass while proving
nothing. It aborts rather than issuing that vacuous pass — a reported abort about
a software rasteriser is the instrument being honest, not a failure.

Note that CDP network throttling does **not** move `navigator.connection`, so
emulating a slow link is not enough to exercise this path; the gate overrides the
Network Information API directly, which is the signal the code actually reads.

## 4e. The node target has been exercised — it is not an untested branch

Every build this project ships takes the `GITHUB_PAGES=true` static-export
branch. The node branch is the *default*, and defaults that never run are how
go-live day turns into a debugging session. It was built and served locally on
2026-08-06, and it works. Reproduce with:

```bash
npm run build            # no GITHUB_PAGES -> node target
npx next start -p 3123
```

Verified against that server, so these are observed responses rather than
intentions:

| Check | Result |
| --- | --- |
| Build | Compiles clean, no `/api/*` route (the enquiry endpoint is gone) |
| CSP | Full policy present on **both** the document and static assets |
| `connect-src` | Carries `api.github.com` + `raw.githubusercontent.com` — the Keeper works |
| Other headers | `nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`, `Permissions-Policy` |
| HTML caching | `Cache-Control: no-cache` |
| Hashed assets | `public, max-age=31536000, immutable` |
| Routes | `/`, `what-we-buy`, `purity-and-weight`, `contact`, `faq`, `insights`, `keeper`, `legal/privacy`, `sitemap.xml` — all 200 |
| Indexing guard | `robots.txt` = `Disallow: /`, plus `<meta name="robots" content="noindex, nofollow, nocache">` |

One structural gain worth knowing before choosing a host: on the node target
`robots.txt` is served from the **origin root**, where crawlers actually look
for it. On a Pages *project* site it can only ever live at `/pw/robots.txt`,
which no crawler reads — the reason indexing control there rests entirely on the
per-page meta tag. Moving to a node host fixes that class of problem rather than
working around it.

## 4f. Production IS live, on Vercel — verified 2026-08-16

**https://pw-peach-psi.vercel.app** — publicly reachable, no authentication wall.

GitHub Pages continues in parallel as the `/pw` preview. Vercel is the node
target, so it is the deployment that actually serves the headers §4e describes.
Everything below was observed against the live origin, not inferred:

| Check | Result |
| --- | --- |
| All nine routes | 200, including `/keeper` |
| `robots.txt` | `Disallow: /` — served from the **origin root**, where crawlers look |
| Meta robots | `noindex, nofollow, nocache` |
| Canonical + `og:url` | `https://pw-peach-psi.vercel.app` — the real host |
| `.example` leakage | none |
| CSP | present on the live document |
| Hashed assets | `public, max-age=31536000, immutable` |
| Hero film | plays at 1440px and 390px; `/video/*.mp4` serve 206 |
| OG share card | `/opengraph-image` → 200, `image/png`, 276KB, absolute URL on the real host |
| Twitter card | `summary_large_image` with title, description and image |
| Rendered check | `npm run shot:live` — no page errors, no failed requests, no sideways scroll |
| Visible `[INSERT …]` chips | 40 in source, 25 rendered on the homepage |

**Indexing is off, and must stay off** until CONTENT-PLACEHOLDERS.md is cleared.
Forty placeholder chips are currently rendering under a real business's name;
that is the system working exactly as designed — nothing is invented — but it is
not a state to be indexed in. Two independent guards hold the line: the meta tag
and the origin-root `robots.txt`. Turning indexing on is one env var
(`NEXT_PUBLIC_ALLOW_INDEXING=true`) and should be the LAST thing done, not an
early one.

**The canonical URL was a real trap and is now closed.** Vercel builds this repo
with no environment set, and `brand.url` falls back to `www.pureweight.example`.
Had that not been fixed in next.config.ts hours before the site went public,
every canonical, `og:url` and sitemap entry on the live origin would have named
a domain that does not resolve. See the note there for the resolution order.

**Custom domain.** Vercel's deployment protection on this account uses
`all_except_custom_domains` — attaching a domain makes it public while leaving
preview URLs protected. When a real domain is attached, set
`NEXT_PUBLIC_SITE_URL` on the Vercel project to it; the automatic host detection
is a safety net for unconfigured builds, not a substitute for saying which
domain is canonical.

## 5. Verification after first deploy

```bash
npm run verify        # typecheck + lint + geometry + contrast + budget
curl -sI https://<domain>/            # expect security headers (node) + HTML 200
curl -s  https://<domain>/robots.txt  # expect Allow with sitemap, NOT "Disallow: /"
curl -sI https://<domain>/_next/static/...css  # expect immutable, max-age=31536000
```

Then: check the OG card renders on an actual share. **This is now confirmed
working** on the Vercel origin — `/opengraph-image` returns 200 as `image/png`
with an absolute URL on the real host, which is exactly the thing Pages could
not do (it served the route with the wrong content-type). The absolute URL is
only correct because of the host detection in next.config.ts; without it the
card would point at `www.pureweight.example` and every share would break.

There is no enquiry webhook to test: the valuation form and its API route were
removed when the business settled on trading over the counter.

## 6. Rollback

- **Node hosts:** platform-native (Vercel: previous deployment promote).
- **Pages:** keeps only the latest deployment — rollback is `git revert` + push,
  which re-runs the gated workflow. There is no faster path; know this before
  an incident, not during one.

## 7. Not yet in place (deliberate, tracked in the audit)

- Monitoring / uptime / error reporting — decide at go-live (audit suggests a
  simple uptime check + Sentry free tier; both are additions to layout.tsx and
  the workflow, no architecture change).
- Analytics + consent — nothing is loaded today and only sessionStorage is
  used, so no consent banner is currently required; adding GA/GTM changes that
  the same day.

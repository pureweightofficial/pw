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

## 5. Verification after first deploy

```bash
npm run verify        # typecheck + lint + geometry + contrast + budget
curl -sI https://<domain>/            # expect security headers (node) + HTML 200
curl -s  https://<domain>/robots.txt  # expect Allow with sitemap, NOT "Disallow: /"
curl -sI https://<domain>/_next/static/...css  # expect immutable, max-age=31536000
```

Then: submit a real enquiry end-to-end and confirm it arrives at the webhook;
check the OG card renders on an actual share (Pages serves it with the wrong
content-type — node hosts serve it correctly).

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

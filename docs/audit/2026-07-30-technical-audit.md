<!-- Generated from a 14-agent adversarially-verified audit. Regenerate: see git history of this file. -->

## Executive Summary

The engineering fundamentals are strong — three.js provably absent from the initial payload,
metric-matched font fallbacks, a fail-open reveal system, machine-audited text contrast, typed
content guardrails — but the audit found **47 verified issues**, concentrated in four clusters:

1. **The two assets/behaviours that gate LCP** — a 640KB logo PNG preloaded at high priority on
   every page, and the hero headline held at `opacity:0` until 211KB of JS hydrates.
2. **A keyboard-functionality bug in the enquiry form** (form-level Enter interception suppresses
   every button inside it) plus a cluster of WCAG 2.2 non-text-contrast and focus findings.
3. **Metadata correctness at go-live** — sitemap/canonical trailing-slash mismatch, og:url pointing
   at the homepage from every subpage, and the undocumented basePath coupling that would break a
   custom-domain launch.
4. **Mobile form ergonomics** — 15.2px inputs trigger iOS auto-zoom through all six steps.

Nothing found is a Critical-severity live harm today (the preview is deliberately noindex and the
form deliberately disabled there), but items 1–4 all become user-facing the day this goes to a
real host and real traffic.

## Top 10 Highest-Impact Fixes

| # | Fix | Dim | Sev | Effort |
| --- | --- | --- | --- | --- |
| 1 | Stop suppressing Enter on form buttons (scope the interceptor to text inputs) | A11y | High | S |
| 2 | Re-export the logo at ~520px / WebP (~30–60KB vs 640KB), or obtain the SVG | Perf | High | S |
| 3 | Exempt above-fold hero copy from the JS-gated reveal so LCP paints with the HTML | Perf | High | M |
| 4 | Form fields 15.2px → 16px to stop iOS zoom-on-focus through the 6-step form | Mobile | High | S |
| 5 | Raise form-control border contrast to ≥3:1 (WCAG 1.4.11) | A11y | High | S |
| 6 | Move the mobile-menu close control inside the dialog + focus trap | Mobile/A11y | High | S |
| 7 | One metadata pass: trailing-slash sitemap URLs, per-page og:url, full og on /request-a-valuation | SEO | High | M |
| 8 | `npm update next` out of the vulnerable 15.5.x range (6 high advisories via bundled deps) | Sec | Med | S |
| 9 | Document + decouple the `/pw` basePath from GITHUB_PAGES before any custom-domain launch | Infra | Med | S |
| 10 | Add a CSP (node headers + meta fallback); the site is fully self-contained so a tight one is cheap | Sec | Med | M |

## Phased Roadmap

**Immediate (this week):** #1, #2, #4, #5, #6, #8 — all S-effort, all High or feeding High items.
**Short-term (30 days):** #3, #7, #9, #10 · cap `request.formData()` body size · magic-byte file
validation · submission-success focus management · scroll-padding for the fixed header ·
`tel:`/`mailto:` anchors · attachment remove button to 44px.
**Long-term / go-live gates:** production host with immutable caching + brotli (Pages caps at
`max-age=600`, gzip) · monitoring + error reporting (no uptime check or Sentry today) · analytics +
consent decision · motion-stack code splitting (50KB gz off every content route) · unify the gold
ramp (defined in 3 systems, 2 divergent value sets) · rollback + custom-domain runbook.

---

# Pureweight Gold Exchange — Full Technical Audit

**Date:** 2026-07-30 · **Method:** 7 parallel dimension auditors + 7 independent adversarial
verifiers (14 agents, 370 tool calls). Every finding below was independently re-verified against
the code and the live site before inclusion; findings the verifier refuted are in Appendix A with
the refutation. Deliberate design decisions (noindex preview, 503-without-webhook, placeholder
system, static-host header limits) were fenced off in advance and are not reported as defects.

**Scope:** repo `H:\VS Code File\pureweight-gold-exchange` · live preview
https://pureweightofficial.github.io/pw/ · both build targets (node server + static export).

## Health Score: 70/100

| Category | Score |
| --- | --- |
| Performance & Core Web Vitals | **60** |
| Technical SEO & AI Readiness | **70** |
| Accessibility (WCAG 2.2) | **60** |
| Security (OWASP Top 10) | **75** |
| Code Quality & Architecture | **85** |
| Mobile Experience & UX | **65** |
| Infrastructure, CI & Analytics | **75** |

Scores are the verifier-adjusted values, not the auditors' first impressions.

---

## Performance & Core Web Vitals — 60/100

> CWV fundamentals are largely well-engineered: three.js is verifiably absent from the initial payload (0 refs in served HTML, no WebGLRenderer in any initial chunk, single dynamic ssr:false entry), all media is dimension-safe (aspect containers, metric-matched font fallbacks via size-adjust/ascent-override, 5 font preloads as designed), and the homepage ships 34.6KB gzip HTML + 14.2KB gzip CSS with all scripts async. The two real LCP threats are self-inflicted: the hero h1 (LCP candidate) is opacity:0 at first paint until 211KB gzip JS hydrates and GSAP reveals it (3s watchdog worst case), and a 640KB 1200x1239 logo PNG is high-priority preloaded on every page while rendering at most 260px wide (served raw on Pages; node target would optimize it via next/image sizes+avif/webp per config).

### [High] 640KB logo PNG is preloaded at high priority and served raw on Pages, rendered at most 260px wide

**Where:** `public/brand/pureweight-logo.png:1`

**Evidence:** curl -sI .../pw/brand/pureweight-logo.png -> Content-Length: 640338, Content-Type: image/png, Cache-Control: max-age=600. Served HTML head: <link rel="preload" as="image" href="/pw/brand/pureweight-logo.png"/> (from priority on Nav.tsx:111 wordmark + Loader.tsx:204). Intrinsic 1200x1239 (node header parse); Logo.tsx:53-57 sizes cap render at 240-260px; loader renders it at clamp(150px,28vw,240px). File referenced by 4 <img> tags in the homepage HTML, all pointing at the same raw PNG because images.unoptimized=true on Pages (next.config.ts:49).

**Impact:** Every first view on Pages downloads 640KB at preload priority, competing with the 137.9KB of preloaded fonts and 14.2KB CSS for bandwidth during the LCP window; on a 1.6Mbps mobile connection that is ~3.2s of transfer for an asset rendered ~5x smaller than its intrinsic size. Node target is unaffected in code (sizes + avif/webp formats configured, Logo.tsx:90, next.config.ts:52) but was not live to measure.

**Fix (S effort):** Pre-optimize the asset itself so both targets benefit: re-export the 1200x1239 lockup at ~520px (2x of 260px render) and recompress (pngquant/oxipng, or WebP ~30-60KB), or better, obtain the SVG the Logo.tsx:26 comment already asks for. Optionally export the wordmark/monogram crops as separate small files so the mobile nav does not pull the full lockup. No business facts involved — this is pure asset work, permitted within the Pages-unoptimized design decision.

*Verifier:* Independently reproduced: public/brand/pureweight-logo.png is 640,338 B; live HTML head contains <link rel="preload" as="image" href="/pw/brand/pureweight-logo.png"/> and 4 img references to the raw file; images.unoptimized=true in the Pages branch of next.config.ts; Logo.tsx SIZES caps render at 240-260px (monogram 64px) and its own comment requests an SVG replacement. Mobile nav's monogram variant is a CSS crop of the same full PNG, so mobile pulls all 640KB. Fix is pure asset work (re-export ~520px / recompress / SVG), touches no business facts, and stays within the Pages-unoptimized design decision; crop fractions in Logo.tsx are proportional so a same-aspect re-export only needs the NATURAL constant updated.

### [High] LCP element (hero h1) is opacity:0 at first paint; LCP is gated on full JS hydration + GSAP reveal

**Where:** `src/app/globals.css:774`

**Evidence:** layout.tsx:165-176 blocking head script adds js-ready before first paint; globals.css:774-777 `.js-ready .will-reveal{opacity:0;transform:translateY(18px)}`; Hero.tsx:86 h1 carries will-reveal. Reveal only fires in MotionProvider.tsx:200-215 (ScrollTrigger.batch, 1.15s tween) after hydration of 211kB gzip First Load JS (build output: route / = 211 kB; measured initial script transfer 253,370B gz incl. 39.8KB nomodule). Watchdog un-hides at 3000ms if hydration fails (layout.tsx:171-174). The only LCP-eligible content painted before hydration is the small nav logo img — the hero poster is inline SVG, which is not an LCP candidate type.

**Impact:** The server-rendered hero headline cannot register as LCP until ~213KB gz of JS downloads, parses, and hydrates, plus a GSAP frame — on mid-tier mobile this pushes LCP well past the 2.5s 'good' threshold even though the text is already in the HTML; worst case (failed/slow hydration) LCP is pinned near the 3s watchdog. BY-DESIGN-ADJACENT: the fail-open reveal system is deliberate and sound; the genuine gap is applying it to above-the-fold content.

**Fix (M effort):** Exempt the hero's above-fold elements from JS-gated hiding: drop will-reveal from Hero.tsx:82-113 (h1, eyebrow, lead, CTA row) and give them a CSS-only entrance (`@media (prefers-reduced-motion: no-preference){ .hero-reveal{ animation: rise .9s ease-out both } }`), keeping ScrollTrigger.batch for below-fold sections. Alternatively scope the bootstrap to hide only elements below the first viewport. Either preserves the fail-open guarantee while letting LCP paint with the HTML.

*Verifier:* Reproduced the full mechanism: blocking REVEAL_BOOTSTRAP in src/app/layout.tsx adds js-ready before first paint; globals.css .js-ready .will-reveal { opacity:0; translateY(18px) }; Hero.tsx lines 82-97 put will-reveal on eyebrow, h1, lead, and CTA row; reveal fires only in MotionProvider.tsx ScrollTrigger.batch (1.15s tween) after hydration, with a 3000ms fail-open watchdog. Hero poster is inline SVG (ScalePoster.tsx), not an LCP candidate, so only the small nav logo paints as eligible content pre-hydration. The proposed fix (CSS-only entrance for above-fold hero elements, keep batch for below-fold) preserves fail-open and reduced-motion behavior — batch simply selects the remaining .will-reveal elements. Correct and safe. Minor citation drift only: files live in src/components/sections/ and src/components/chrome/, not the paths named.

### [Medium] GSAP+Lenis+ScrollTrigger (50.2kB gz) ship in the shared First Load JS on every route

**Where:** `src/app/layout.tsx:207`

**Evidence:** Build output: 'First Load JS shared by all 197 kB' with chunks/1693d80f914cfbde.js 50.2 kB; grep of the served chunk: 1693d80f914cfbde gsap=1 lenis=1 scrolltrigger=1. Static content routes pay it too: /faq, /contact, /insights, /legal/[slug], /type-specimen all = 183 kB First Load JS. MotionProvider is mounted unconditionally in layout.tsx:207.

**Impact:** Legal shells, FAQ and contact pages — pages with no scroll choreography to speak of — each hydrate 183kB gz of JS, inflating TBT/INP risk and delaying the (currently JS-gated) reveal on every route. 197kB shared is roughly double a typical content-site baseline (react-dom chunk alone measured 59.8kB gz).

**Fix (M effort):** Load the motion stack lazily inside MotionProvider: `const [mods, setMods] = useState(null); useEffect(() => { Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('lenis')]).then(setSetup) }, [])` with native scrolling until it arrives (the reveal system already fails open), or render MotionProvider only in a homepage-level layout segment and let secondary routes use plain scrolling. Either removes ~50kB gz from the critical path of every route.

*Verifier:* Reproduced: out/_next/static/chunks/1693d80f914cfbde.js gzips to 50,321 B (~50.2 kB) and contains gsap, lenis, and ScrollTrigger strings; the chunk is script-referenced in every exported route's HTML (/, /faq, /contact, /insights); MotionProvider wraps the whole body in src/app/layout.tsx. The lazy-import fix is viable because the reveal system already fails open (3s watchdog removes js-ready) — implementation must also make useMotion's scrollTo fall back to native scrolling until the modules arrive, which the claimed fix explicitly covers.

### [Low] GitHub Pages serves hashed /_next/static assets with Cache-Control: max-age=600 and gzip only (no brotli)

**Where:** `next.config.ts:42`

**Evidence:** curl -sI on /pw/_next/static/chunks/a045362f2411aef6.css -> Cache-Control: max-age=600 (no immutable); same on woff2 font and logo PNG. Request with 'Accept-Encoding: gzip, br' returned Content-Encoding: gzip (HTML 208,662B raw -> 34,616B gzip; CSS 90,205B -> 14,244B).

**Impact:** Content-hashed immutable assets (fonts, 253KB of JS, CSS) expire from browser cache after 10 minutes, so a returning visitor next day re-downloads the entire bundle — repeat-visit LCP/INP gets no caching benefit, and brotli would shave a further ~10-15% off text transfer. BY-DESIGN-ADJACENT: this is an immutable GitHub Pages platform behavior, not a repo defect, and is acceptable while the site is a noindex preview.

**Fix (S effort):** No code fix exists on Pages. Record it as a go-live constraint: the production deployment should use the node target (Next sets `Cache-Control: public, max-age=31536000, immutable` on /_next/static automatically) or a static host that honors immutable caching + brotli (Cloudflare Pages, Netlify, Vercel). Add one line to the deployment notes so the host choice is made with this number in hand.

*Verifier:* Reproduced byte-for-byte on the live chunk a045362f2411aef6.css: Cache-Control: max-age=600 with no immutable, Content-Encoding: gzip when br was offered, 90,205 B raw -> 14,244 B gzip; same max-age=600 on the logo PNG. This is an inherent GitHub Pages host limitation adjacent to deliberate decision 2 (static-host constraints), not a code defect — the claimed fix correctly proposes only a deployment-notes line for the go-live host choice, which is safe. Severity lowered: no code action exists, impact is confined to a noindex preview, and the resolution is the already-planned host decision.

### [Low] First-visit loader curtain covers the page for a minimum 2.4s after hydration and paints the 640KB PNG again

**Where:** `src/components/chrome/Loader.tsx:115`

**Evidence:** Loader.tsx:115 `const MIN_MS = 2400`; Loader.tsx:131 HERO_WAIT_CEILING = 2600; Loader.tsx:175 failsafe 6000ms; Loader.tsx:193 `fixed inset-0 z-[100] ... bg-void` renders only after hydration (visible starts null, Loader.tsx:39, so SSR HTML and first paint are unblocked); Loader.tsx:204 <Logo variant="full" priority /> renders the same 640,338B PNG at <=240px.

**Impact:** CWV metrics are mostly unaffected (it appears post-first-paint, is fixed-position so zero CLS, and content beneath keeps painting), but the first meaningful interaction is deferred >=2.4s per session and the curtain's centerpiece is the unoptimized 640KB PNG. BY-DESIGN-ADJACENT: the curtain, once-per-session gating, skip affordances and reduced-motion bypass are deliberate and well-built; the only genuine gap inside it is the asset weight, fixed by finding 1.

**Fix (S effort):** No change to the curtain itself. Ship the optimized logo asset (finding 1) so the loader's hero image is tens of KB, and consider dropping MIN_MS to ~1800ms once the client signs off — that is a taste decision, flagged only because it sits on the first-visit critical path.

*Verifier:* Reproduced in src/components/chrome/Loader.tsx: MIN_MS=2400 gates the counter (value reaches 100 only when elapsed >= MIN_MS AND ready), HERO_WAIT_CEILING=2600, 6000ms failsafe, visible starts null so SSR/first paint is unblocked, and the curtain renders <Logo variant="full" priority /> (same 640,338 B PNG, browser-cached so re-painted not re-fetched). Escape hatches exist (click, Escape/Enter/Space, failsafe). The fix correctly defers the asset weight to finding 1 and flags MIN_MS as a client taste decision — appropriate for Low.


## Technical SEO & AI Readiness — 70/100

> The underlying SEO structure is largely sound — one H1 per page, unique titles/descriptions, correct noindex gating (insights/legal/type-specimen excluded from the sitemap and marked noindex, verified live), a valid placeholder-free FAQPage JSON-LD, key narrative copy fully present in crawlable HTML outside the canvas, and lang="en-GB" set. The defects that would bite the day NEXT_PUBLIC_ALLOW_INDEXING=true are all in the metadata layer: sitemap URLs 301-redirect and mismatch every canonical (trailing-slash drift), Next's shallow openGraph merge makes every subpage claim og:url=homepage with the homepage's og:title, and the flagship /request-a-valuation page loses its share image, og:url, og:type and og:site_name entirely.

### [High] Every subpage without its own openGraph block declares og:url = homepage and the homepage's og:title/description

**Where:** `src/app/layout.tsx:129`

**Evidence:** layout.tsx:123-130 sets `openGraph: { ... url: brand.url }`. Live verification: /faq/, /contact/, /insights/ and /legal/privacy/ all render `<meta property="og:url" content="https://pureweightofficial.github.io/pw/"/>` and `<meta property="og:title" content="Pureweight Gold Exchange — Private Gold Valuation &amp; Exchange"/>` — the homepage's values — while their <title> and canonical are page-specific. twitter:title is likewise the generic "Pureweight Gold Exchange" on every route.

**Impact:** With indexing on, og:url is a canonical-adjacent signal that contradicts <link rel=canonical> on every subpage; any share (or AI crawler reading OG as the page identity, e.g. Perplexity/Bing citation cards) attributes FAQ/Contact content to the homepage URL with the wrong title. Direct hit to AI-search citation quality.

**Fix (M effort):** Add a helper in src/lib/site.ts, e.g. `pageMeta({ title, description, path })` returning a complete Metadata fragment: `{ title, description, alternates: { canonical: path }, openGraph: { title, description, url: path, siteName: brand.name, type: 'website', images: ['/opengraph-image'] }, twitter: { card: 'summary_large_image', title, description } }`, and use it in faq/contact/insights/request-a-valuation/legal pages. Remove `url` from the root layout's openGraph so nothing inherits a homepage og:url. (openGraph.url + images resolve through metadataBase, so basePath and trailing slash are applied automatically — verified: canonicals already resolve to /pw/...&#47; correctly.)

*Verifier:* Reproduced live on /faq/, /contact/ and /insights/: all render og:url=https://pureweightofficial.github.io/pw/ and the homepage og:title while their <title>/canonical are page-specific; twitter:title is the generic brand name everywhere. Root cause verified at layout.tsx openGraph `url: brand.url`. Fix (pageMeta helper + remove layout url) is correct; metadataBase resolution demonstrably applies basePath+trailing slash (canonicals prove it). One required addition: src/app/page.tsx defines no openGraph of its own, so removing url from the layout also strips og:url from the homepage — apply pageMeta (or an explicit openGraph.url) to page.tsx as well. Kept High: systemic, misattributes every subpage share today, and persists silently into production.

### [Medium] Sitemap URLs lack trailing slashes: every entry 301-redirects and mismatches its canonical on the Pages/static target

**Where:** `src/app/sitemap.ts:24`

**Evidence:** sitemap.ts:24 `url: `${base}/request-a-valuation``; live sitemap.xml has <loc>https://pureweightofficial.github.io/pw/faq</loc> while the live page's canonical is https://pureweightofficial.github.io/pw/faq/ ; `curl -I .../pw/faq` returns `HTTP/1.1 301 Moved Permanently` (next.config.ts:47 sets trailingSlash: true for the export).

**Impact:** The moment indexing is enabled, the sitemap submits four redirecting, non-canonical URLs — crawl waste, canonical-signal conflict, and Search Console will report 'sitemap URL is a redirect' for 100% of entries. Next resolves <link rel=canonical> with the trailing slash but does NOT rewrite sitemap.ts output, so the two disagree on every deployment that sets trailingSlash.

**Fix (S effort):** Derive the slash from the same config as routing. In next.config.ts (beside line 30): `process.env.NEXT_PUBLIC_TRAILING_SLASH = isPages ? 'true' : '';` then in sitemap.ts: `const slash = process.env.NEXT_PUBLIC_TRAILING_SLASH ? '/' : ''; ... { url: `${base}/faq${slash}` }` (root stays `${base}/`). This keeps the node target (no trailing slash) correct too.

*Verifier:* Reproduced: sitemap.ts builds `${base}/faq` etc. with no slash; live sitemap.xml <loc> values are slashless; curl -I /pw/faq returns 301; next.config.ts sets trailingSlash: true only when GITHUB_PAGES=true; live canonical is /pw/faq/. Fix is safe and correct — it mirrors the existing NEXT_PUBLIC_BASE_PATH env-derivation pattern already in next.config.ts, and keeps node-target URLs slashless (unconditional slashes would 308 there). Severity downgraded: sitemap is read only by crawlers, and the preview's robots.txt disallows all crawling (decision 1), so there is zero current impact; it becomes High only at go-live.

### [Medium] /request-a-valuation loses og:image, og:url, og:site_name and og:type entirely (shallow openGraph replace drops the file-convention image)

**Where:** `src/app/request-a-valuation/page.tsx:11`

**Evidence:** page.tsx:11-14 defines `openGraph: { title, description }` only. Live /request-a-valuation/ head contains ONLY og:title + og:description — no og:image, og:url, og:site_name, og:type, and no twitter:image — whereas /faq/ (which defines no openGraph) inherits the full set including `og:image content="https://pureweightofficial.github.io/pw/opengraph-image?2252b834ae17f11a"`. Next 15 replaces the parent's resolved openGraph object wholesale, including the root opengraph-image.tsx file-convention image.

**Impact:** The page the whole site funnels to — explicitly documented (page.tsx:20-22) as the link/bookmark/campaign landing page — renders as a bare, imageless, untyped card on WhatsApp/Slack/X/LinkedIn and gives AI crawlers no og:url identity. Worst possible page for this to happen to.

**Fix (S effort):** Make its openGraph complete (via the pageMeta helper from the previous finding): include `url: '/request-a-valuation'`, `siteName: brand.name`, `type: 'website'`, and `images: ['/opengraph-image']` (the un-hashed path serves 200 — verified with curl). Same treatment for any future page that sets a custom og title.

*Verifier:* Reproduced live: /request-a-valuation/ head contains only og:title and og:description — no og:image, og:url, og:site_name, og:type, no twitter:image — while /faq/ (no openGraph export) inherits the full set including the hashed opengraph-image. page.tsx:11-15 confirmed as the shallow `openGraph: { title, description }`. Fix verified viable: un-hashed /pw/opengraph-image returns HTTP 200 (content-type application/octet-stream is the known Pages issue accepted under decision 2, not a new defect). Severity downgraded to Medium: single route, its og:title/description are correct, and the impact is share-card degradation only while the site is a noindex preview — though it is the designated campaign landing page, so it should be fixed with finding 2's helper.

### [Low] Root layout canonical '/' is inherited by any page that omits alternates — /type-specimen live-declares the homepage as its canonical

**Where:** `src/app/layout.tsx:122`

**Evidence:** layout.tsx:122 `alternates: { canonical: '/' }`. Live /type-specimen/ renders `<link rel="canonical" href="https://pureweightofficial.github.io/pw/"/>` while titled "Type specimen (internal)". type-specimen/page.tsx:19-22 sets robots noindex/nofollow but no alternates. (Otherwise the route is handled correctly: no inbound links anywhere in src — grep confirmed — not in sitemap, robots meta verified live.)

**Impact:** Today the noindex wins, so it is contained — but the pattern means every future page that forgets `alternates` silently canonicalises itself to the homepage, which after indexing is enabled de-indexes that page's content in favour of '/'. An internal tool asserting rel=canonical to the money URL is also noise for any crawler that fetches it.

**Fix (S effort):** Delete `alternates: { canonical: '/' }` from layout.tsx (src/app/page.tsx:19 already declares its own canonical '/'), so a missing per-page canonical becomes a visible gap instead of a wrong signal. Optionally add `alternates: { canonical: null }` to type-specimen. Better: honour its own comment — 'DELETE THIS ROUTE once the face is chosen' — before go-live.

*Verifier:* Reproduced: layout.tsx:122 has alternates:{canonical:'/'}; live /pw/type-specimen/ renders canonical=https://pureweightofficial.github.io/pw/ alongside meta robots noindex,nofollow,nocache. Fix verified safe: grep shows every real route declares its own canonical (page.tsx:19, faq, contact, insights, legal/[slug], request-a-valuation), so deleting the layout default changes nothing else. Severity downgraded to Low: the route is noindex+nofollow, has zero inbound links in src, is absent from the sitemap, and search engines largely ignore canonicals on noindexed pages — on a fully noindex preview this is hygiene, not harm. The route's own DELETE-before-go-live comment is the real remedy.

### [Low] Sitemap lastModified is the build timestamp, not a content date

**Where:** `src/app/sitemap.ts:19`

**Evidence:** sitemap.ts:19 `const lastModified = new Date();` — live sitemap shows all four URLs stamped 2026-07-30T05:26:23.020Z, the time of the last deploy.

**Impact:** Every deploy claims all pages changed. Google explicitly ignores <lastmod> from sites where it is demonstrably inaccurate, throwing away a genuinely useful crawl signal for when real content (insights articles, filled placeholders) does change.

**Fix (S effort):** Either omit lastModified entirely until content dates exist, or hold per-route dates in src/lib/site.ts (e.g. `updated: '2026-07-30'` per page, bumped when copy changes) and map them in sitemap.ts.

*Verifier:* Reproduced: sitemap.ts:19 `const lastModified = new Date()`; all four live <lastmod> values are identically 2026-07-30T05:26:23.020Z (deploy time). Fix (omit until real content dates exist, or per-route dates in site.ts) is safe — lastModified is optional in MetadataRoute.Sitemap. Low is correctly calibrated: search engines mostly distrust lastmod anyway, and the preview is uncrawlable.

### [Low] No WebSite or Organization JSON-LD, though both are buildable today from verified brand assets without breaching the Verifiable guard

**Where:** `src/lib/site.ts:377`

**Evidence:** buildLocalBusinessJsonLd() (site.ts:377-408) correctly returns null while address/legalName are placeholders — live homepage contains zero application/ld+json blocks (grep count 0). But brand.name, brand.url and the logo file (public/brand/pureweight-logo.png, already used by opengraph-image.tsx:65) are verified brand assets, not pending client facts.

**Impact:** When indexing switches on, the site presents no entity signal at all until the client clears the address/legalName placeholders — yet Organization {name, url, logo} and WebSite {name, url} assert nothing unverified. Entity establishment (knowledge panel, AI-answer attribution, logo in results) is exactly the AEO groundwork this business needs, and it is currently gated behind facts it does not depend on. BY-DESIGN-ADJACENT: the LocalBusiness gate itself is correct and should stay.

**Fix (M effort):** Add to site.ts: `export function buildOrganizationJsonLd() { return { '@context': 'https://schema.org', '@type': 'Organization', name: brand.name, url: brand.url, logo: `${brand.url}/brand/pureweight-logo.png` }; }` (plus a WebSite node with the same name/url), emit it unconditionally in layout.tsx alongside the gated LocalBusiness block, and let buildLocalBusinessJsonLd() continue to upgrade the entity once facts verify. Optionally add BreadcrumbList to /faq, /contact, /request-a-valuation via the same helper.

*Verifier:* Reproduced: live homepage contains 0 application/ld+json blocks; buildLocalBusinessJsonLd() (site.ts:377+) correctly returns null while address/legalName are placeholders, and layout.tsx:179/200 already contains the gated emit point the fix would sit beside. The claim's precision holds — /faq/ does emit 1 FAQPage block, and the missing nodes are specifically WebSite/Organization. Fix inputs verified real: brand.name, brand.url, and /pw/brand/pureweight-logo.png (HTTP 200, already used by opengraph-image.tsx). This is BY-DESIGN-ADJACENT to decision 1 but does not contradict it: name/url/logo are verified brand assets, not pending client facts, so emitting them fabricates nothing. Low stands (no indexing benefit until the noindex preview flips).

### [Low] robots.txt is unreachable by crawlers on the Pages target (served under /pw/, not the origin root)

**Where:** `src/app/robots.ts:13`

**Evidence:** Live file exists only at https://pureweightofficial.github.io/pw/robots.txt (verified: 'User-Agent: *\nDisallow: /'); the robots exclusion protocol only reads https://pureweightofficial.github.io/robots.txt, which this project-site deploy cannot control.

**Impact:** On Pages, robots.ts output is decorative — the Disallow-all is never read by any crawler. Protection currently holds anyway because every page carries `noindex, nofollow, nocache` meta (verified on all six fetched routes), so this is BY-DESIGN-ADJACENT to the static-host decision; the genuine gap is only that nobody should believe the robots.txt layer is active while previewing on Pages, and the production domain must be deployed at the domain root (or basePath removed) for robots.ts and /sitemap.xml discovery to function.

**Fix (S effort):** No code change for the preview. Add one line to the go-live checklist (CONTENT-PLACEHOLDERS.md or README): 'Production must serve at the domain root — robots.txt and sitemap.xml are only honoured at /, so the /pw basePath variant is preview-only.'

*Verifier:* Reproduced: /pw/robots.txt serves 'User-Agent: *\nDisallow: /' while https://pureweightofficial.github.io/robots.txt returns 404, and RFC 9309 only consults the origin root — a /pw project-site deploy cannot control it. BY-DESIGN-ADJACENT to decision 2 (static-host limits) but decision 2 does not enumerate this gap, and it subtly weakens decision 1: the 'Disallow ALL' half of the preview protection is not actually in force on Pages — only the per-page meta noindex (verified present on every route) protects the preview. The proposed fix is documentation-only (go-live checklist note that robots.txt/sitemap.xml are honoured only at the domain root) and therefore safe. Low stands, given meta noindex fully covers indexing.


## Accessibility (WCAG 2.2) — 60/100

> Accessibility intent is unusually strong and mostly real — fieldset/legend per step with focus management, error summary with role=alert and per-field aria-invalid/describedby, retained answers across steps (3.3.7 pass), consistent footer help (3.2.6 pass), comprehensively gated reduced motion (global CSS kill-switch verified at globals.css:799-818, MotionProvider/Lenis/magnetic/SceneCursor/loader/scenes all check the media query, .pw-scroll-dot covered by the global rule), aria-hidden canvases, no hover-only or pointer-only functionality (WebGL scenes have zero pointer handlers), and 24px+ targets throughout — but four genuine AA-level defects remain, three of them concentrated in the core enquiry form: a form-level Enter handler that cancels activation of every button in it, ~1.35:1 input boundaries, an invisible-focus file upload, and a fixed header with no scroll-padding (2.4.11). Conformance estimate: fails AA today on 1.4.11 (field borders), 2.4.7 (file input), 2.4.11 (fixed nav), with the Enter hijack an operability defect at Level A in practice; all four are small fixes, after which AA (WCAG 2.2) is credibly reachable — remaining gaps list: mobile-menu close control outside the trap, success-state focus/announcement, and the loader curtain, with 2.4.13 (AAA) the only known focus-appearance shortfall.

### [High] Form-level Enter interception suppresses activation of every button inside the multi-step form

**Where:** `src/components/form/ValuationForm.tsx:394`

**Evidence:** ValuationForm.tsx:394-405: `onKeyDown={(event) => { if (event.key === 'Enter' && !isLast && (event.target as HTMLElement).tagName !== 'TEXTAREA') { event.preventDefault(); goNext(); } }}` — the handler is on the <form>, so Enter bubbling from ANY control except a textarea is preventDefault()ed, which cancels native button activation (button click fires from keydown-Enter default).

**Impact:** Keyboard users pressing Enter on an option tile (step 1 is entirely buttons), the Back button, a Remove-image button, or the file input do NOT activate that control — the form silently advances a step instead (or throws a validation error via the summary focus). Only Space (keyup-activated, not intercepted) works, which is undiscoverable. Enter-on-Back moving FORWARD is actively wrong. WCAG 2.1.1 in practice, plus 3.2 predictability.

**Fix (S effort):** Restrict advancement to genuine text-entry targets: `const t = event.target as HTMLElement; if (event.key === 'Enter' && !isLast && t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'file' && t.tagName !== 'TEXTAREA') { event.preventDefault(); goNext(); }` — i.e. only intercept INPUT[type=text|email|tel] (and SELECT if desired); never BUTTON, A, or INPUT[type=file|checkbox].

*Verifier:* Reproduced at ValuationForm.tsx:394-405 exactly as quoted. preventDefault on bubbled Enter cancels native activation: option tiles cannot be selected with Enter, Back advances forward instead of back, remove-image buttons fail, and error-summary anchor links (contact step) are fully keyboard-inoperable since links have no Space fallback — a WCAG 2.1.1 failure. Fix verified safe against every control per step: consent checkbox is on the last step (uninhibited), selects fall through to implicit submission → onSubmit → goNext (same behavior), buttons/links regain native activation. The trailing tagName !== 'TEXTAREA' clause in the fix is redundant (tagName === 'INPUT' already excludes it) but harmless.

### [High] Text input and option-tile boundaries measure ~1.35:1 and ~1.2:1 — WCAG 1.4.11 non-text contrast failure

**Where:** `src/app/globals.css:657`

**Evidence:** globals.css:657 `.field { border: 1px solid rgba(145,141,132,0.22) }` over the inset-panel composite (~#090908 = rgba(9,9,8,0.72) over #0a0809). Composited border = 0.22*(145,141,132)+0.78*(9,9,8) ≈ #272624, L≈0.0194; field interior rgba(3,3,3,0.6) composites to ~#050505, L≈0.0015. Contrast = (0.0694)/(0.0515) ≈ 1.35:1. globals.css:704 `.option-tile` border rgba(145,141,132,0.16) composites to ~#1f1e1c ≈ 1.2:1. The inset box-shadow (black on near-black) adds nothing. Required: 3:1.

**Impact:** The border is the ONLY indicator of where a text field is and how big it is (labels sit above; interior bg is indistinguishable from the panel). Low-vision users cannot locate the click/tap extent of any input in the site's core conversion flow. Focused (gold, ~7:1) and selected-tile borders pass, but the resting state fails 1.4.11.

**Fix (S effort):** Raise resting border to ≥3:1 against both adjacent surfaces. Composite math: rgba(145,141,132,α) over #090908 needs α ≈ 0.62 to reach ~#5e5c58 (3.05:1). Change `.field` to `border: 1px solid rgba(145,141,132,0.62);` (or a solid token e.g. #5f5c55) and `.option-tile` to the same or add a persistent inner hairline; keep the existing gold focus/selected treatments.

*Verifier:* Independently recomputed: field border 1.33:1 vs interior and 1.31:1 vs panel; option-tile border 1.19:1 (compositing rgba borders over inset-panel over void). scripts/check-contrast.mjs audits text/placeholder colours only, so this sits outside the passing gates (decision 6 is text contrast). Text fields have visible labels (an arguable 1.4.11 escape), but the unselected option-tile BUTTONS rely entirely on the border/fill for identification as interactive, which is an unambiguous failure. Fix caveat: my strict compositing puts alpha 0.62 at 2.93-2.98:1, marginally short of 3:1 — use alpha ~0.65-0.66 (or ~#66635c) and re-verify against the darkest ground.

### [Medium] File-upload control has no visible keyboard focus indicator (sr-only input, styled label gets nothing)

**Where:** `src/components/form/ValuationForm.tsx:594`

**Evidence:** ValuationForm.tsx:594-599: `<input id={`${uid}-images`} type="file" multiple ... className="sr-only" />` following the styled dropzone `<label htmlFor={`${uid}-images`} ...>` (lines 570-592). The input stays in the tab order but is 1px-clipped, so its :focus-visible outline is invisible; the label has hover styles only (`hover:border-gold-antique/70`), no focus styles.

**Impact:** Keyboard users tabbing through the Images step land on an element with zero visible focus indication — WCAG 2.4.7 (Level AA) failure. They cannot tell the picker is focused or that Space/Enter would open it (and Enter is currently also hijacked, see finding 1).

**Fix (S effort):** Move the input before the label and pair them: `<input className="peer sr-only" ... /><label className="... peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-gold-rich peer-focus-visible:outline-offset-3 peer-focus-visible:border-gold-antique/70" ...>` (or CSS `label:has(+ input:focus-visible)` if DOM order must stay).

*Verifier:* Reproduced: label at 570-592 precedes the sr-only input at 594-604; Tailwind sr-only (clip: rect(0,0,0,0), 1px, overflow hidden) clips the global :focus-visible outline entirely and the label has hover-only styles — the focused tab stop is invisible (WCAG 2.4.7). Fix verified safe: htmlFor pairing is id-based so reordering is fine, the input is absolutely positioned so space-y-6 layout is unchanged, and peer-focus-visible works in Tailwind v4 with input-first order. Severity lowered: this is a single optional control on one step while every other control in the form retains a visible indicator — the two form-wide High findings are of a different magnitude.

### [Medium] No scroll-padding for the 72px fixed header — reverse-tabbed focus lands fully underneath it (WCAG 2.2 2.4.11)

**Where:** `src/app/globals.css:84`

**Evidence:** Nav.tsx:95-97 renders `<header className="fixed inset-x-0 top-0 z-50 ...">` at --nav-h:72px; grep for `scroll-padding|scroll-margin` across src returns no matches; globals.css:84-106 sets `html { scroll-behavior: auto }` with no scroll-padding-top. Keyboard Tab/Shift+Tab uses native minimal scrolling, which brings an element to the top viewport edge — behind the opaque-when-scrolled fixed bar.

**Impact:** Shift+Tab (and in-page fragment jumps like the error-summary links `#uid-field` and the skip link on short viewports) can place the focused element entirely under the fixed navigation: focus fully obscured, failing 2.4.11 Focus Not Obscured (Minimum), Level AA — one of the new WCAG 2.2 criteria this audit targets.

**Fix (S effort):** Add to the `html` rule in globals.css: `scroll-padding-top: calc(var(--nav-h) + 16px);`. Native keyboard scrolling and fragment navigation then clear the bar; Lenis's scrollTo already offsets -84 so behaviour becomes consistent.

*Verifier:* Reproduced: grep across src returns zero scroll-padding/scroll-margin matches; Nav.tsx renders the fixed header at --nav-h 72px, opaque (bg-void/82 + blur) once scrolled past 48px; globals.css html rule has scroll-behavior: auto only. Native sequential-focus scrolling brings elements to the top edge, fully behind the bar — WCAG 2.2 2.4.11 (AA). Fix verified consistent: scroll-padding-top calc(var(--nav-h) + 16px) = 88px aligns with the existing Lenis offset of -84 (MotionProvider.tsx:284) and affects only scroll-into-view/anchor operations, not Lenis's manual scrolling.

### [Medium] Mobile menu: only close control (the header toggle) sits outside the focus trap and outside the aria-modal dialog

**Where:** `src/components/chrome/Nav.tsx:141`

**Evidence:** Nav.tsx:141-146: the hamburger/close toggle is in the z-50 <header>; the dialog is the separate z-40 panel (lines 179-187, `role="dialog" aria-modal="true" ref={panelRef}`). hooks.ts:187-210 useFocusTrap cycles Tab strictly within `panelRef` (`root.querySelectorAll(...)`), so the visible close button can never receive keyboard focus while the menu is open, and aria-modal declares it inert to screen readers even though it renders on top of the panel.

**Impact:** Keyboard and screen-reader users have no reachable Close control — Escape (window keydown, Nav.tsx:60-66) is the only exit and is never advertised. Sighted keyboard users see an X they cannot tab to. Background page content also is not inert (aria-modal only), so SRs without modal support can wander behind the panel.

**Fix (M effort):** Render a visible 'Close' button as the first child inside the panel div (inside the trap), or move the panel markup so it wraps/includes the header toggle; optionally apply `inert` to <main> and <footer> while menuOpen.

*Verifier:* Reproduced: toggle lives in the z-50 header (Nav.tsx:141-166), dialog is the separate z-40 panel with role=dialog aria-modal=true (179-187); useFocusTrap (hooks.ts:187-227) queries focusables only within panelRef and moves initial focus into the panel (line 217), so the visible X can never be Tab-reached while open, and aria-modal declares it outside the dialog for SRs despite rendering on top. Escape does close (Nav.tsx:60-66), so an exit exists — Medium is correctly calibrated, not High. Fix (visible close inside the panel, or inert on siblings) is safe.

### [Medium] On successful submission focus is dropped to <body> and the confirmation may never be announced

**Where:** `src/components/form/ValuationForm.tsx:336`

**Evidence:** ValuationForm.tsx:336-338: `if (status === 'sent') { return (<div className="inset-panel ..." role="status" aria-live="polite">` — the whole form (which held focus on the now-disabled Send button, line 836 `disabled={status === 'sending'}`) unmounts and is replaced by a NEWLY INSERTED live region. Live regions announce mutations to existing regions; initial content of a freshly-mounted aria-live node is not reliably announced (NVDA/VoiceOver both skip it in common cases). No element in the success view receives focus.

**Impact:** A blind user who activates Send gets: focus silently reset to the top of the document, and possibly no announcement that the enquiry succeeded or that a reference number exists they are told to write down. Failure of focus management (2.4.3) and status messaging intent (4.1.3).

**Fix (S effort):** Add `const successRef = useRef<HTMLHeadingElement>(null)` and in an effect on `status === 'sent'` call `successRef.current?.focus()` with `tabIndex={-1}` on the <h2> ('Thank you — your details are with us.'); keep role=status as belt-and-braces.

*Verifier:* Reproduced at ValuationForm.tsx:336-338: on status 'sent' the entire form (whose submit button held focus and is disabled during 'sending') unmounts and is replaced by a newly-mounted div with role=status aria-live=polite; browsers drop focus to body when the focused element unmounts, and initial content of a freshly-inserted live region is not reliably announced by NVDA/VoiceOver (live-region semantics apply to mutations of pre-existing regions). No element in the success view receives focus and the reference number the user is told to keep may go unannounced. Fix (tabIndex=-1 + focus the h2, keep role=status) is the standard correct pattern.

### [Low] Step legend is auto-focused on initial page load, stealing focus before the user acts (and racing the Loader's skip focus)

**Where:** `src/components/form/ValuationForm.tsx:193`

**Evidence:** ValuationForm.tsx:193-196: `useEffect(() => { if (status === 'sent') return; legendRef.current?.focus(); }, [stepIndex, status]);` — effects run on mount, so simply loading /request-a-valuation moves focus into the fieldset legend. Loader.tsx:81 `skipRef.current?.focus()` also fires on first visit to any route (Loader is in root layout), so two components contend for focus.

**Impact:** Focus jumps past the skip link and navigation on page load, disorienting screen-reader users who expect reading to start at the top (2.4.3 focus order). Whichever of Loader-skip/legend focuses last wins, so behaviour is nondeterministic on first visit.

**Fix (S effort):** Skip the first run: `const firstRender = useRef(true); useEffect(() => { if (firstRender.current) { firstRender.current = false; return; } if (status !== 'sent') legendRef.current?.focus(); }, [stepIndex, status]);`

*Verifier:* Reproduced: the effect at ValuationForm.tsx:193-196 depends on [stepIndex, status] and runs on mount, focusing the legend on plain page load (bypassing the skip link); Loader.tsx:81 focuses Skip and layout.tsx:208 confirms Loader renders in the root layout, so both contend for focus on a first visit to /request-a-valuation. Fix is correct for production; note the firstRender ref guard is defeated by StrictMode's dev-only double-mount (cleanup never resets it), which is cosmetic and does not affect the shipped build.

### [Low] Loader curtain is not focus-trapped: Tab from Skip moves focus behind the full-screen overlay

**Where:** `src/components/chrome/Loader.tsx:191`

**Evidence:** Loader.tsx:191-197: full-viewport `fixed inset-0 z-[100]` div with role="status"; the page beneath is fully rendered by design ('This is a curtain, not a gate'). Only Escape/Enter/Space dismiss (lines 170-172); Tab is not handled and the background is not inert, so focus moves to nav links/CTAs that are 100% hidden under the curtain.

**Impact:** For up to ~6s (failsafe ceiling, line 175) a keyboard user's focus can rest on fully-obscured elements — a transient 2.4.11 Focus Not Obscured issue. Mitigated by short duration, the focused Skip control, and reduced-motion users never seeing the loader. BY-DESIGN-ADJACENT: the curtain concept is deliberate; only the trap is missing.

**Fix (S effort):** While visible, either apply `inert` to `<main>`/`<header>`/`<footer>` siblings, or add a keydown Tab handler that keeps focus on the Skip button (single-element trap), releasing on dismiss.

*Verifier:* Reproduced: Loader.tsx renders fixed inset-0 z-[100] with no Tab handling (only Escape/Enter/Space dismiss at 170-172) and no inert on siblings; the page beneath is fully rendered by design. One evidence overstatement: the FIRST Tab from Skip lands on the nav skip-link, which becomes visible at z-[110] — above the curtain; only subsequent stops (logo, nav links) are hidden beneath it. Substantively correct. Low is right: the state is transient (auto-dismisses at 100%, 6s failsafe, and any Enter/Space/Escape lifts it). Fix (inert siblings or single-element trap) is safe.

### [Low] Upload live region re-announces every percentage change during send

**Where:** `src/components/form/ValuationForm.tsx:850`

**Evidence:** ValuationForm.tsx:850-852: `<p className="sr-only" role="status" aria-live="polite">{status === 'sending' ? `Sending your enquiry. ${uploadPercent} per cent complete.` : ''}</p>` with uploadPercent updated from every xhr.upload.onprogress event (line 296-300, Math.round to 1% granularity).

**Impact:** On a multi-photo upload a screen reader queues up to 100 near-identical polite announcements ('Sending your enquiry. 41 per cent...'), which can talk over the eventual success/error message. Chatty 4.1.3 implementation rather than a failure.

**Fix (S effort):** Throttle announcements to 25% steps: render `${Math.floor(uploadPercent / 25) * 25} per cent` in the live region (keep the visual button text at full granularity), and announce 'Sending' once when status flips.

*Verifier:* Reproduced at ValuationForm.tsx:850-852: the polite live region's text embeds uploadPercent, updated from every xhr.upload.onprogress event at 1% granularity (line 296-300), so each render mutates the region and queues an announcement — up to ~100 announcements during a multi-photo mobile upload, drowning out everything else. Fix (quantise the announced value to 25% steps while keeping the visual button text at full granularity) is correct and low-risk.

### [Low] Footer 'pending' service markers explained only via title attribute; 1px focus ring passes AA but not 2.2 AAA focus-appearance

**Where:** `src/components/chrome/Footer.tsx:90`

**Evidence:** Footer.tsx:90-97: `<span className="text-[0.55rem] ..." title="Pending client confirmation">pending</span>` — the explanation exists only in a title tooltip (unavailable to touch and keyboard; the ValuationForm appointment step has a visible explanation at lines 747-750, the footer does not). Separately, globals.css:152-156 `:focus-visible { outline: 1px solid var(--color-gold-rich); outline-offset: 3px; }` — #d99a33 measures 8.4:1 on void, 8.2:1 on char, 7.6:1 on stone (all pass 1.4.11's 3:1 and 2.4.7), but a 1px perimeter is below the 2px-equivalent area of WCAG 2.2 2.4.13 Focus Appearance (AAA only).

**Impact:** BY-DESIGN-ADJACENT: the pending markers are part of the deliberate no-fabrication system — the gap is only that the meaning is hover-locked in the footer (WCAG 1.4.13-adjacent / equal access to the note). Focus ring is a conformance PASS at AA; noting the AAA delta so the '1px sufficient?' question has a measured answer.

**Fix (S effort):** Footer: add `<span className="sr-only"> (pending client confirmation)</span>` inside the marker, or reuse the visible one-line note from the form. Focus ring: optional `outline-width: 2px` for AAA headroom — colour needs no change.

*Verifier:* Reproduced both halves: Footer.tsx:90-97 has title="Pending client confirmation" as the only explanation (unavailable to keyboard/touch/SR users, who get the bare word 'pending'), while the form's appointment step has a visible explanation at 747-750 — an inconsistency, and a genuine gap WITHIN the by-design pending-marker system (decisions 1/4 cover the markers' existence, not their a11y mechanics). globals.css:151-156 confirms the 1px gold outline; the finding correctly frames the ring as AA-passing with 2.4.13 being AAA-only headroom, so that half is informational, keeping the whole at Low. Fixes (sr-only suffix; optional 2px outline) are trivial and safe.


## Security (OWASP Top 10) — 75/100

> Clean security posture for a static-preview + future node deploy: no secrets in any of the 14 commits, no cookies (one sessionStorage flag), crypto-correct reference generation (randomBytes, 32-char alphabet divides 256 evenly — no modulo bias), React-escaped form echo, generic error messages with spam-control failures deliberately opaque, and env-only webhook URL (no SSRF surface). Genuine gaps: no CSP is defined on EITHER target (feasible and tight here since the site has zero third-party runtime), request.formData() buffers unbounded bodies before any size check, the rate-limit key trusts client-controlled x-forwarded-for (severity deployment-dependent), and next 15.5.22 carries 6 high prod npm-audit advisories via bundled postcss/sharp (limited real exploitability: no remotePatterns, build-time CSS only). Live Pages headers confirmed via HEAD request: only HSTS (max-age=31556952) + Access-Control-Allow-Origin:* — XCTO/XFO/Referrer-Policy/Permissions-Policy absent as expected for a static host (BY-DESIGN-ADJACENT per decision #2), but Referrer-Policy and CSP CAN be added via meta tags and currently are not.

### [Medium] A05: No Content-Security-Policy on either deployment target

**Where:** `next.config.ts:61`

**Evidence:** next.config.ts:61-73 headers() sets only X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy — no CSP key. Repo-wide grep for 'Content-Security-Policy|http-equiv' (excluding package-lock.json): no matches. Live Pages HEAD response: no CSP header (only HSTS max-age=31556952, ACAO:*, caching headers).

**Impact:** No injection containment on a site where a tight CSP is unusually cheap: zero third-party runtime (fonts.googleapis.com in opengraph-image.tsx:42 is build-time Satori only, never in the browser). Without CSP, any future XSS or supply-chain script runs unrestricted.

**Fix (M effort):** Node target — add to the headers() array in next.config.ts: { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'" }. Pages target — same policy minus frame-ancestors (ignored in meta per spec) as <meta httpEquiv="Content-Security-Policy" .../> in src/app/layout.tsx <head>. 'unsafe-inline' in script-src is genuinely required: Next App Router emits per-page inline RSC flight scripts (self.__next_f.push) that cannot be nonced on a static host and are impractical to hash; REVEAL_BOOTSTRAP (layout.tsx:165-176) is static/hashable and the two JSON-LD blocks (layout.tsx:201, faq/page.tsx:118) also need script-src-elem allowance, but the flight scripts alone force 'unsafe-inline' on Pages. 'unsafe-inline' in style-src is required by the SSR'd style attribute on <html> (layout.tsx:187) and next/font's inlined @font-face. blob: in img-src is required by attachment previews (ValuationForm.tsx:227 URL.createObjectURL); data: covers blur placeholders. On the node target a stricter nonce + 'strict-dynamic' policy via middleware is achievable later.

*Verifier:* Reproduced fully: next.config.ts:61-73 sets only XCTO/XFO/Referrer-Policy/Permissions-Policy; repo-wide grep for CSP/http-equiv (excl. package-lock) has zero hits; live Pages response carries no CSP. Fix independently validated as safe for this codebase: geometry is 100% procedural (geometry.ts:13 — no DRACO/KTX2/WASM, no workers found in src), all external fetches are build/server-side (opengraph-image.tsx, webhook), blob: is genuinely needed for ValuationForm.tsx:227 previews, style 'unsafe-inline' needed for the SSR html style attr (layout.tsx:187), and the live page contains 38 inline __next_f.push flight scripts forcing script 'unsafe-inline' on Pages. frame-ancestors correctly omitted from the meta variant per spec. Node-target gap is real and not covered by deliberate decision 2 (which says node headers ARE configured — CSP simply isn't among them).

### [Medium] A05: request.formData() parses unbounded body before any size check

**Where:** `src/app/api/valuation/route.ts:159`

**Evidence:** route.ts:159 'form = await request.formData()' runs before the per-file (valuation-schema.ts:74, 8MB) and total (route.ts:211, 24MB) checks at lines 197-216. App Router route handlers have no default body-size limit (unlike the old pages API 4MB default), so the entire multipart body is buffered in memory before validation.

**Impact:** A multi-GB POST is fully buffered before rejection — memory exhaustion / OOM on the single node instance. The rate limiter runs first (route.ts:145) but is bypassable via x-forwarded-for rotation (see separate finding), so the two gaps compound into a practical DoS on a bare-VPS deployment. Not applicable to the Pages target (no API route, decision #2).

**Fix (S effort):** Before line 157, reject oversized bodies from the header: const len = Number(request.headers.get('content-length')); if (!Number.isFinite(len) || len > UPLOAD_LIMITS.maxTotalBytes + 1_048_576) { return NextResponse.json({ ok: false, error: 'That submission is too large. Please attach fewer images.' }, { status: 413 }); } (content-length is mandatory for browser multipart POSTs; rejecting absent/chunked lengths is safe here). Also enforce client_max_body_size ~26m at the reverse proxy when self-hosting.

*Verifier:* Evidence reproduced exactly: route.ts:159 buffers the full multipart body after only the rate-limit check (line 145), before the 8MB per-file (valuation-schema.ts:74) and 24MB total (route.ts:211) checks; App Router handlers have no default body limit. CAVEAT — the fix snippet as written fails OPEN on its stated 'reject absent/chunked lengths' intent: request.headers.get() returns null when absent and Number(null)===0 (also Number('')===0), which is finite and below the limit, so a chunked request with no Content-Length bypasses the guard entirely and still reaches unbounded formData(). The guard must first reject a null/empty content-length header explicitly (e.g. const h = request.headers.get('content-length'); if (!h || !Number.isFinite(Number(h)) || Number(h) > limit) return 413). With that one correction plus the proxy client_max_body_size, the fix is correct. Rate limit preceding the parse does not mitigate: its key is client-spoofable (finding 4), so per-key limits are rotatable.

### [Medium] A06: next 15.5.22 in vulnerable range — 6 high prod advisories via bundled postcss and sharp

**Where:** `package.json`

**Evidence:** npm audit --omit=dev: '6 high severity vulnerabilities' — postcss <=8.5.17 under node_modules/next (GHSA-r28c-9q8g-f849 path traversal, GHSA-6g55-p6wh-862q arbitrary file read, GHSA-qx2v-qp2m-jg93 XSS via unescaped </style>) and sharp <0.35.0 (GHSA-f88m-g3jw-g9cj, libvips CVE-2026-33327/33328/35590/35591); advisory range 'next 9.3.4-canary.0 - 16.3.0-preview.7' includes installed 15.5.22. Full npm audit: 12 high (extra 6 are dev-only: brace-expansion DoS GHSA-mh99-v99m-4gvg via @eslint/eslintrc). 

**Impact:** Honestly limited exploitability today: the postcss issues need attacker-controlled CSS/sourcemaps at build time (none exists); sharp only runs in the node target's image optimizer, and next.config.ts:52 defines no remotePatterns so it processes local assets only; the static export ships neither. This is currency risk, not an open hole — it becomes real if remote images are ever allowlisted.

**Fix (M effort):** Do NOT run 'npm audit fix --force' (it would install next@9.3.3 — a resolver downgrade artifact, not a fix). Track and bump next to the first stable release above the advisory range (>16.3.0-preview.7 or a backported 15.x patch) via 'npm install next@latest' once available; re-run npm run verify after. Keep remotePatterns absent until then.

*Verifier:* Reproduced: npm audit --omit=dev reports exactly '6 high severity vulnerabilities'; postcss (GHSA-r28c-9q8g-f849, GHSA-6g55-p6wh-862q, GHSA-qx2v-qp2m-jg93) and sharp (GHSA-f88m-g3jw-g9cj) advisories verbatim; range 'next 9.3.4-canary.0 - 16.3.0-preview.7' includes installed next@15.5.22 (verified via npm ls); audit output literally states fix --force 'Will install next@9.3.3', confirming the downgrade-artifact warning. Full audit = 12 high, confirmed. One composition error in the evidence: the 6 prod highs are NOT all via postcss/sharp — @eslint/eslintrc is misplaced in package.json `dependencies` (not devDependencies), so the brace-expansion/minimatch/@eslint/eslintrc chain accounts for 3 of the 6 --omit=dev highs. The claimed 'extra 6 are dev-only via @eslint/eslintrc' is wrong; those come from the dev eslint toolchain. Bonus remediation: move @eslint/eslintrc to devDependencies. Core fix guidance (wait for patched next, never audit fix --force, keep remotePatterns absent) is correct and safe.

### [Medium] A07/BY-DESIGN-ADJACENT: rate-limit key trusts client-controlled x-forwarded-for

**Where:** `src/app/api/valuation/route.ts:79`

**Evidence:** route.ts:79-83 clientKey() returns request.headers.get('x-forwarded-for') first token, falling back to x-real-ip, then the literal 'unknown'. No verification the header came from a trusted proxy.

**Impact:** Deployment-dependent, per decision #3 the in-memory limiter itself is accepted. Behind Vercel/Cloudflare the platform overwrites XFF — spoofing is not possible and this is a non-issue. Directly exposed on a VPS with no reverse proxy, the header is attacker-set: rotating XFF values yields unlimited submissions (defeating the 5/hour cap and amplifying the body-parse DoS and webhook spam), while ALL legitimate clients that send no XFF share the single 'unknown' bucket — 5 enquiries/hour site-wide, a self-inflicted availability cap.

**Fix (S effort):** Make proxy trust explicit: read a platform-verified header when present and configured (e.g. const trusted = process.env.TRUST_PROXY === 'true'; use x-forwarded-for only when trusted, otherwise fall back to the connection address — in Next node runtime, request.headers.get('x-vercel-forwarded-for') on Vercel or expose the socket IP via a custom server/middleware). Document in .env.example that TRUST_PROXY must match the topology. Keep honeypot + elapsedMs as-is (by design).

*Verifier:* Reproduced verbatim at route.ts:79-83: first token of x-forwarded-for, then x-real-ip, then literal 'unknown', with no proxy-trust verification — and note the FIRST XFF token is the client-supplied one even behind an honest appending proxy, so the limiter key is spoofable per-request, making the 5/hour window rotatable at will. This is a genuine gap WITHIN deliberate decision 3: the decision covers the in-memory single-instance limiter and honeypot/timing design, not trusting unverified client headers for the key. The TRUST_PROXY fix is sound and correctly preserves the by-design controls; .env.example exists for the documentation step.

### [Low] A05/BY-DESIGN-ADJACENT: Pages missing Referrer-Policy that a meta tag CAN supply

**Where:** `src/app/layout.tsx:189`

**Evidence:** Live HEAD of https://pureweightofficial.github.io/pw/ returns only: Strict-Transport-Security: max-age=31556952, Access-Control-Allow-Origin: *, cache/CDN headers. Absent: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy (all four ARE set for the node target at next.config.ts:66-69).

**Impact:** The absence itself is decision #2 (static host, accepted). The genuine gap within it: Referrer-Policy is meta-addable and currently isn't, so Pages leaks full URLs (with /pw paths) as referrer to any linked destination. XCTO, XFO and Permissions-Policy have NO meta equivalent — honestly not fixable on Pages, and note ACAO:* is GitHub's own header, harmless for a public static site.

**Fix (S effort):** Add <meta name="referrer" content="strict-origin-when-cross-origin" /> to the <head> in src/app/layout.tsx (works on both targets, matches the node header so they cannot drift), plus the meta CSP from the CSP finding. Accept XCTO/XFO/Permissions-Policy as impossible on Pages until the site moves to a host with header support.

*Verifier:* Reproduced live: HEAD of https://pureweightofficial.github.io/pw/ returns only HSTS max-age=31556952, Access-Control-Allow-Origin: *, and cache/CDN headers — XCTO/XFO/Referrer-Policy/Permissions-Policy all absent, while all four are set for the node target (next.config.ts:66-69). This is a genuine gap within decision 2: the decision accepts that Pages cannot serve response headers, but <meta name="referrer" content="strict-origin-when-cross-origin"> is a spec-supported non-header delivery that works on a static host and matches the node header exactly, preventing drift. Accepting XCTO/XFO/Permissions-Policy as impossible on Pages is correct. Low severity is right for a noindex preview.

### [Low] A04: file validation trusts client-declared MIME type — no magic-byte check

**Where:** `src/lib/valuation-schema.ts:71`

**Evidence:** valuation-schema.ts:71 'UPLOAD_LIMITS.accept.includes(file.type ...)' — file.type is the browser/attacker-declared Content-Type of the multipart part; bytes are never sniffed. route.ts:221-227 comment confirms image bytes are intentionally NOT forwarded — only {name, type, bytes} metadata reaches the webhook (route.ts:247-251).

**Impact:** Near-zero today: no byte ever leaves the request, so a mislabeled file can't be stored or served. This becomes a real polyglot/stored-content risk at the exact moment S3/R2/UploadThing storage is wired up per the route's own TODO.

**Fix (M effort):** When storage is added, sniff magic bytes server-side before persisting (JPEG FF D8 FF, PNG 89 50 4E 47, WEBP 'RIFF....WEBP'; HEIC/HEIF via ftyp brand at offset 4 — e.g. the 'file-type' package), store with a server-generated key (never file.name), and serve with Content-Disposition: attachment + X-Content-Type-Options: nosniff. No change needed until then.

*Verifier:* Reproduced: valuation-schema.ts:71 checks only file.type (attacker-declared multipart Content-Type); bytes are never sniffed anywhere. Also verified the mitigating context: route.ts:221-227 comment plus route.ts:247-251 confirm image bytes are never persisted or forwarded — only {name, type, bytes} metadata reaches the webhook — so current exploitability is nil and 'no change needed until storage is added' is the correct disposition. The deferred fix (magic-byte sniff, server-generated keys, Content-Disposition: attachment + nosniff on serve) is sound. Low is correctly calibrated.

### [Low] A03 hardening: JSON-LD/bootstrap injected without escaping '<' (no user input path today)

**Where:** `src/app/layout.tsx:201`

**Evidence:** layout.tsx:201 and faq/page.tsx:118 use dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}. All inputs verified static: REVEAL_BOOTSTRAP is a hardcoded literal (layout.tsx:165-176); FAQ jsonLd is built from the hardcoded 'general' array + brand.shortName (faq/page.tsx:104-112); LocalBusiness jsonLd only from verifiedValue() fields in site.ts:377-408. Review-step echo is safe — plain JSX children, React-escaped (ValuationForm.tsx:931-940).

**Impact:** Not exploitable now — no user input reaches any HTML sink anywhere in src. But JSON.stringify does not escape '<', so if any Verifiable field or FAQ answer ever contains '</script>' (e.g. future CMS-fed content), it terminates the script block and injects markup.

**Fix (S effort):** Belt-and-braces one-liner at both sites: JSON.stringify(jsonLd).replace(/</g, '\\u003c') — valid JSON, byte-identical semantics, removes the entire future class.

*Verifier:* Reproduced both sites: layout.tsx:199-202 and faq/page.tsx:116-119 use dangerouslySetInnerHTML with raw JSON.stringify. Independently verified every input is static/developer-controlled: REVEAL_BOOTSTRAP is a hardcoded literal (layout.tsx:165-176); FAQ jsonLd builds only from the hardcoded 'general' array (faq/page.tsx:104-112); LocalBusiness jsonLd emits only verifiedValue() fields and returns null otherwise (site.ts:377-408); the form review step is React-escaped JSX children (ValuationForm.tsx:931-940 — note actual path is src/components/form/, not valuation/). The .replace(/</g, '<') hardening is valid JSON, semantically identical, and closes the future class. Correctly Low — no exploitable path today.


## Code Quality & Architecture — 85/100

> React/Next correctness is strong overall — hooks are cleaned up, the WebGL lifecycle is deliberately engineered, the API route has full try/catch coverage, and quality gates are real — but a handful of genuine defects remain: a stale-closure blob-URL leak in ValuationForm's unmount cleanup, two ordering hazards in the shared three.js resource refcount/quality system, an undisposed cloned texture, and no app/global-error.tsx despite error.tsx being named "GlobalError". Maintainability debt is concentrated in dead exports (overrideCapability, isHeroReady, useReducedMotion, pointerActive) and a gold color ramp defined in three systems with two divergent value sets (pre-rebrand #b98220/#d7a83d/#ffe9a8 hard-coded in 10+ files vs the sampled tokens #b87914/#d99a33/#fcc933 in globals.css and re-declared in opengraph-image.tsx).

### [Medium] Gold ramp defined in three systems with two divergent value sets

**Where:** `src/app/globals.css:34`

**Evidence:** globals.css:34-37 defines the sampled tokens `--color-gold-antique: #b87914; --color-gold-rich: #d99a33; --color-gold-high: #fcc933; --color-gold-pale: #fffdda`. opengraph-image.tsx:31-34 re-declares those same values as local constants. Meanwhile the OLD ramp `#b98220/#d7a83d/#ffe9a8/#f2ce72` is hard-coded in 11 files / 41 occurrences (grep), including pure-UI SVGs: Services.tsx:184-190, ValuationJourney.tsx:152-190, WhyPureweight.tsx:67-69, ScalePoster.tsx:44-150, canvases.tsx AssayPoster:76-107, and ValuationForm.tsx:783 `accent-[#b98220]`. opengraph-image.tsx:14-16 itself records that the card 'had already drifted once' to the pre-rebrand palette — the section SVGs still carry it.

**Impact:** The posters, section illustrations and form accent render a measurably different gold than the CSS tokens and OG card — the exact drift class the OG comment warns about, now live across the page. Any future palette resample must be applied by hand in 11 files. (3D albedo values in materials.ts/Studio.tsx are arguably art-directed and may stay literal, but the SVG/UI usages are not.)

**Fix (M effort):** Route the SVG gradients through CSS custom properties (`stop-color="var(--color-gold-rich)"` works in inline SVG) or a single exported `GOLD` constant object in lib (imported by ScalePoster, canvases, sections, and opengraph-image), and replace `accent-[#b98220]` with `accent-gold-antique`.

*Verifier:* Reproduced: globals.css:34-37 defines the sampled tokens (#b87914/#d99a33/#fcc933/#fffdda); opengraph-image.tsx:30-36 re-declares the same values as local constants; and grep finds exactly 41 occurrences of the pre-rebrand ramp (#b98220/#d7a83d/#ffe9a8/#f2ce72) across 10 src files including pure-UI surfaces (Services.tsx, ValuationJourney.tsx, WhyPureweight.tsx, ScalePoster.tsx, canvases.tsx, and accent-[#b98220] in ValuationForm.tsx). materials.ts:24-25 even claims its albedos are 'the brand's antique/rich/highlight golds' while carrying the old values, and opengraph-image.tsx:12-16 documents this exact class of drift having happened before. One correction to the fix: stop-color="var(...)" works for inline DOM SVG but not in Satori, so opengraph-image must use the shared exported constant, and 3D albedo values should be re-tuned deliberately (tone mapping changes rendered output) rather than swapped blindly; the shared-constant approach covers both. Medium stands: this is a visible brand inconsistency on a brand-led site, and the existing WCAG contrast gate covers text tokens, not these gradients.

### [Low] Stale closure in ValuationForm unmount cleanup never revokes attachment object URLs

**Where:** `src/components/form/ValuationForm.tsx:246`

**Evidence:** ValuationForm.tsx:246-252: `useEffect(() => () => { attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl)); }, // eslint-disable-next-line react-hooks/exhaustive-deps [], );` — the `[]` deps mean the cleanup closes over the FIRST render's `attachments`, which is always `[]` (line 125 `useState<Attachment[]>([])`). The comment above it says 'Object URLs are a real leak if left dangling' — and they are left dangling.

**Impact:** Any images attached and still present when the component unmounts (user navigates away mid-form, or after 'sent') leak their blob URLs for the lifetime of the document — up to 5 x 8 MB of retained blobs per form visit in an SPA session. The eslint-disable hides exactly the stale-closure class the rule exists to catch.

**Fix (S effort):** Mirror attachments into a ref and revoke from it: `const attachmentsRef = useRef<Attachment[]>([]); useEffect(() => { attachmentsRef.current = attachments; }, [attachments]); useEffect(() => () => { attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.previewUrl)); }, []);`

*Verifier:* Reproduced at ValuationForm.tsx:246-252: cleanup effect has [] deps so it closes over the first render's attachments, which is [] (useState<Attachment[]>([]) at line 125). removeFile (lines 237-243) revokes individually but the unmount path revokes nothing, contradicting the comment at line 245. The ref-mirror fix is correct and safe. Downgraded to Low: bounded to 5 disk-backed File blobs (UPLOAD_LIMITS.maxFiles) per form mount/unmount cycle, only leaks when a visitor attaches images then SPA-navigates away, and object-URL registry entries for disk-backed Files carry minimal memory.

### [Low] engravedGold clones a cached texture; the clone is never disposed

**Where:** `src/components/webgl/materials.ts:167`

**Evidence:** materials.ts:167: `const normal = engravingNormalMap().clone();` — the clone gets its own GPU texture but lives only inside the cached material. `disposeMaterials()` (line 42-45) calls `m.dispose()`, which does not dispose a material's maps, and `disposeTextures()` only disposes cache entries. The clone is in neither cache.

**Impact:** Every full dispose/rebuild cycle (all scenes scrolled off then back — exactly what the refcount system is designed to do) leaks one 512x512 RGBA texture (~1.3 MB VRAM with mips) that nothing can ever free.

**Fix (S effort):** Register the clone in the texture cache with its own key (add e.g. `export function engravingNormalMapRepeated()` in textures.ts that memoizes the wrapped/repeated clone), or explicitly dispose material maps in disposeMaterials: `cache.forEach((m) => { const mat = m as THREE.MeshStandardMaterial; if (mat.normalMap && !texCacheHas(mat.normalMap)) mat.normalMap.dispose(); m.dispose(); })` — the first option is cleaner.

*Verifier:* Reproduced: materials.ts:167 clones engravingNormalMap() with different wrapT (ClampToEdge vs the original's Repeat from textures.ts:150), so it cannot share the original's GL texture cache entry; disposeMaterials (materials.ts:42-45) calls only m.dispose() which never disposes maps, and disposeTextures (textures.ts:31-34) only disposes cache entries. The clone escapes both paths, a genuine gap in the module's stated dispose discipline. Downgraded to Low because the practical impact is ~zero: dispose only runs when mountedScenes hits 0, at which point every Canvas (and its renderer/GL context) has already been torn down by R3F, reclaiming the GPU memory anyway, and cache.clear() releases the JS reference for GC. The texture-cache registration fix is correct and safe.

### [Low] No app/global-error.tsx — root layout/provider errors are uncovered, and error.tsx is misleadingly named GlobalError

**Where:** `src/app/error.tsx:15`

**Evidence:** error.tsx:15: `export default function GlobalError({ ... })` but the file is `app/error.tsx`; Glob for `src/app/global-error.tsx` returns 'No files found'. Errors thrown in RootLayout — which mounts MotionProvider (Lenis/GSAP), Loader, SceneCursor, and Nav for every route (layout.tsx:206-213) — are not caught by app/error.tsx, only by global-error.tsx.

**Impact:** A throw during MotionProvider/Loader/Nav render or an error inside the error boundary itself falls through to Next's unstyled default error page — no brand voice, no contact exit, on the exact class of chrome components most likely to fail (scroll/WebGL adjacent). The GlobalError name will also mislead a future maintainer into believing the layout is covered.

**Fix (M effort):** Add `src/app/global-error.tsx` with its own `<html><body>` wrapper and a self-contained (no layout CSS assumptions) fallback with the phone/contact exit; rename the component in error.tsx to `RouteError`.

*Verifier:* Reproduced: Glob for src/app/**/global-error.tsx returns nothing; src/app/error.tsx:15 exports a component named GlobalError that is actually the segment-level boundary; layout.tsx:206-213 mounts MotionProvider, Loader, SceneCursor, Nav and Footer on every route, and Next.js segment error.tsx does not catch errors thrown in its own layout — only global-error.tsx does. The fix (self-contained global-error.tsx with its own html/body and the contact exit, rename to RouteError) is correct. Downgraded to Low: on this noindex preview the failure path is unlikely, and Next.js ships a built-in production fallback page for uncaught root errors, so the current gap costs branding/an exit path, not availability.

### [Low] values() cast erases enum literal types — ValuationInput fields degrade to plain string

**Where:** `src/lib/valuation-schema.ts:55`

**Evidence:** valuation-schema.ts:55-56: `const values = <T ...>(list: T) => list.map((item) => item.value) as [string, ...string[]];` — `z.enum(values(ITEM_TYPES))` therefore infers `string`, so `ValuationInput['itemType' | 'condition' | 'preferredContact' | 'appointmentType']` are all `string`. The 'validating' casts in ValuationForm.tsx:113 (`item as ValuationInput['itemType']`) and 116 are casts to `string` — no-ops.

**Impact:** TypeScript cannot catch a typo'd option value passed to `set('itemType', ...)`, a STEP_FIELDS/schema drift, or a server/client enum mismatch; the compile-time half of the 'one schema, cannot drift apart' guarantee (file header, lines 4-9) is silently absent. Runtime zod validation still holds, so this is type-safety debt, not a live bug.

**Fix (M effort):** Preserve literals: `const values = <const T extends readonly { value: string }[]>(list: T) => list.map((i) => i.value) as unknown as { [K in keyof T]: T[K] extends { value: infer V } ? V : never } & [string, ...string[]];` — or simpler, define the value tuples explicitly once: `z.enum(['bullion','jewellery','coins','scrap','other','unsure'])` and derive ITEM_TYPES labels from them.

*Verifier:* Reproduced and proven with a live typecheck: valuation-schema.ts:55-56 casts to [string, ...string[]], and a scratch file assigning 'definitely-not-an-item-type' to ValuationInput['itemType'] compiled with zero errors under the project tsconfig (a control line with a deliberate type error in the same file was flagged, confirming the file was compiled). The casts at ValuationForm.tsx:113/116 are therefore no-op casts to string. Fix directions are sound. Downgraded to Low: compile-time-only erosion with no runtime or user impact — the values are runtime-validated by ITEM_TYPES.some(...) before the cast and by Zod on parse, so no invalid value can flow through.

### [Low] Dead exports: overrideCapability, isHeroReady, useReducedMotion, and scrollState.pointerActive are never consumed

**Where:** `src/lib/capability.ts:137`

**Evidence:** Project-wide grep: `overrideCapability` (capability.ts:137, comment says 'lets the quality demo route force a tier' — no such route exists), `isHeroReady` (readiness.ts:49), and `useReducedMotion` (hooks.ts:25) appear only at their definitions. `pointerActive` (scroll-store.ts:34, 52) is declared and initialized but never written or read anywhere.

**Impact:** Four pieces of API surface that promise behavior nothing provides; useReducedMotion is the sharpest — five components (MotionProvider:64, SceneCursor:34, Loader:43, hooks.ts:103, layout bootstrap) each re-query matchMedia one-shot instead, so a mid-session reduced-motion change is honored nowhere despite a live hook existing for exactly that.

**Fix (S effort):** Delete `overrideCapability`, `isHeroReady`, and `pointerActive`; either delete `useReducedMotion` too or actually adopt it in SceneCursor/Loader where a live value would matter. If the quality-demo seam is wanted later, reintroduce it with the route that uses it.

*Verifier:* Reproduced: project-wide grep over src, scripts, docs and root configs finds overrideCapability only at capability.ts:137 (its own comment references a 'quality demo route' that does not exist anywhere in src/app), isHeroReady only at readiness.ts:49, useReducedMotion only at hooks.ts:25, and pointerActive only at scroll-store.ts:34 (type) and 52 (initializer) — never read or written. Deletion is safe; nothing outside these definition sites references them. Low severity is correctly calibrated.


## Mobile Experience & UX — 65/100

> Mobile fundamentals are unusually well handled — zoom is never disabled (maximum-scale=5 verified in served HTML), Lenis uses native touch scrolling (syncTouch:false), the hero uses min-h-[100svh] against address-bar churn, option tiles are 56px and buttons 44px minimum, scroll lock restores position exactly, and loading/error/empty/preview states are specific and honest (BY-DESIGN placeholders respected). The residual defects are one systemic iOS form annoyance (15.2px field font triggers zoom-on-focus on every input of the 6-step enquiry), a mobile-menu close control that sits outside its own aria-modal focus trap, no tap-to-call wiring anywhere combined with formatDetection.telephone:false, a 32px file-remove target, and a success reference number the user is told to keep but cannot copy; all findings are code+served-HTML evidenced — no visual browser was available, so anything requiring sight (select popup styling on dark, backdrop-blur cost, background-attachment behavior) is marked NEEDS-EYES rather than asserted.

### [High] All form fields are 15.2px — iOS Safari auto-zooms on focus through the entire 6-step enquiry

**Where:** `src/app/globals.css:654`

**Evidence:** globals.css:654 `font-size: 0.95rem;` inside `.field`; shipped CSS confirms: out/_next/static/chunks/578d1d72ede7d253.css contains `.field{...padding:.85rem 1rem;font-size:.95rem;...}`. Every input, select and textarea in ValuationForm uses className="field". Viewport allows zoom (maximum-scale=5 in out/index.html), so iOS Safari zooms the viewport on focus of any text control under 16px and does not zoom back out.

**Impact:** On iPhone, focusing any of the ~8 text controls across the six steps lurches the viewport in, leaving the form cropped and requiring a manual pinch-out per step — the highest-friction possible experience on the site's only conversion flow, likely repeated 4-6 times per enquiry.

**Fix (S effort):** In globals.css change `.field` to `font-size: 1rem;` (16px). Desktop delta is 0.8px and invisible. If 15.2px is wanted on desktop, use `font-size: 1rem;` inside `@media (pointer: coarse)` or `font-size: max(1rem, 0.95rem)` — but a flat 1rem is the simplest correct fix. NEEDS-EYES to confirm the zoom behavior on a physical iPhone; the trigger condition (font <16px + zoom enabled) is fully confirmed in shipped CSS/HTML.

*Verifier:* Reproduced in source (globals.css .field font-size: 0.95rem), in out/_next/static/chunks/578d1d72ede7d253.css, and in the live Pages chunk a045362f2411aef6.css (.field{...font-size:.95rem}). Viewport is width=device-width, initial-scale=1, maximum-scale=5 (zoom deliberately never disabled per layout.tsx comment), so the iOS <16px auto-zoom trigger condition fully holds. Every text control routes through className="field": the shared Field input (ValuationForm.tsx:909), the select (line 530) and the textarea (line 550). Fix (1rem) is safe: min-height 48px and padding are unaffected; 0.8px desktop delta is invisible.

### [High] Mobile menu's only close control sits outside its aria-modal dialog and focus trap

**Where:** `src/components/chrome/Nav.tsx:179`

**Evidence:** Nav.tsx:179-187 — the panel div has `role="dialog" aria-modal="true"` with `ref={panelRef}`; the hamburger/close toggle (Nav.tsx:141-146) is rendered inside the <header>, outside that subtree. hooks.ts:195-209 — useFocusTrap cycles Tab only among focusables inside `ref.current`. The panel's children are 7 nav links + 1 CTA link + logo; it contains no close button. Escape close exists (Nav.tsx:60-66) but is hardware-keyboard only.

**Impact:** aria-modal=true instructs VoiceOver/TalkBack to hide everything outside the dialog — including the close button — so a mobile screen-reader user who opens the menu cannot close it without activating a navigation link (touch has no Escape key). Keyboard users tabbing inside the trap also can never reach the visible X.

**Fix (S effort):** Add a close button as the first child inside the panel div, e.g. `<button type="button" onClick={() => setMenuOpen(false)} className="absolute right-[max(1.5rem,4vw)] top-4 flex h-11 w-11 items-center justify-center border border-gold-antique/30 text-gold-antique"><span className="sr-only">Close menu</span>...X svg...</button>`. The existing header toggle can stay for sighted users; the in-dialog one satisfies the trap and aria-modal.

*Verifier:* Verified: panel div (Nav.tsx:180-187) carries role=dialog aria-modal=true ref={panelRef}; the only toggle is in the header (lines 141-146), outside the panel subtree and hidden from AT by aria-modal. useFocusTrap (hooks.ts) cycles Tab only among focusables inside ref.current; the panel contains 7 primaryNav links (site.ts:134-142) + 1 CTA link and no button. Escape close (Nav.tsx:60-66) is hardware-keyboard only. Fix is correct and safe; note the trap's initial-focus querySelector('button, a[href], input') will land on the new close button first, which is standard dialog behavior.

### [Medium] Attachment remove button is 32x32px — below the 44px touch minimum, corner-anchored over the thumbnail

**Where:** `src/components/form/ValuationForm.tsx:628`

**Evidence:** ValuationForm.tsx:628 `className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center bg-void/85 ..."` — h-8 w-8 = 32px. Contrast with the codebase's own standard: testimonial arrows and the hamburger are h-11 w-11 (44px), and Nav.tsx:134-135 comments explicitly name 44px as the minimum touch target.

**Impact:** The image step is used mid-enquiry on phones (HEIC accepted, so iPhone photos are the expected path). A 32px corner target over a photo invites mis-taps; missing does nothing visible, and users may conclude removal is broken or abandon re-selection.

**Fix (S effort):** Change to `h-11 w-11` (thumbnails are aspect-square cells in a 2-3 column grid — room exists), or keep the 32px visual and extend the hit area: add `p-1.5 -m-1.5 box-content` style padding so the interactive area reaches 44px.

*Verifier:* Reproduced: the remove button in ValuationForm.tsx (button block ~lines 630-633; cited 628 is off by a few lines but the code matches exactly) is h-8 w-8 = 32px, absolute-positioned over the thumbnail. The codebase's own standard is documented in Nav.tsx:134-135 ('min-h-11 = 44px ... below the minimum comfortable touch target') and testimonial arrows/hamburger use h-11 w-11. Thumbnails are aspect-square cells in a grid-cols-2/sm:grid-cols-3 grid (~150px+ on a 360px phone), so h-11 w-11 fits without overlap. Fix safe.

### [Medium] Success reference number: user is told to keep it, but there is no copy affordance and it is lost on navigation

**Where:** `src/components/form/ValuationForm.tsx:345`

**Evidence:** ValuationForm.tsx:345-358 — the reference renders in a display-font span with `tracking-[0.16em]`, followed by "Please keep this reference ... it is not sent to you automatically." No copy button; reference lives only in React state (line 131), so tapping 'Return Home' (line 367) destroys the sole record of the enquiry.

**Impact:** On mobile the prescribed action (keep it) requires long-press text selection of a letter-spaced styled span — fiddly and error-prone — or a screenshot the user must think of themselves. A user who taps Return Home first has permanently lost the only identifier tying them to their enquiry, on a service where that enquiry may concern inherited valuables.

**Fix (M effort):** Add a copy button beside the reference: `<button type="button" onClick={() => navigator.clipboard?.writeText(reference).then(() => setCopied(true))} className="btn-ghost">{copied ? 'Copied' : 'Copy reference'}</button>` with a small `copied` state reset after ~2s; optionally persist `reference` to sessionStorage on receipt so a back-navigation can still surface it.

### [Medium] Dead class `accent-accent-italic` at 15 call sites — italic accent styling silently absent in shipped output

**Where:** `src/app/request-a-valuation/page.tsx:34`

**Evidence:** Grep finds `accent-accent-italic` at 15 sites (request-a-valuation:34, contact:38, faq:126, error:33, not-found:21, insights:38, and 9 homepage sections); globals.css:341 defines only `.accent-italic`. Verified in served output: out/index.html and out/request-a-valuation/index.html each carry the class, while `grep -c accent-accent-italic` on both built CSS chunks returns 0 — no rule exists. Hero.tsx:89 and FinalBalance.tsx:53 use the correct `accent-italic` and do get `font-family:var(--font-accent);font-style:italic`.

**Impact:** The Playfair italic counterpoint — which layout.tsx loads a whole font family for and documents as used 'in 21 places' — is actually applied in only a handful. Fifteen headline accents (including the H1 on the conversion landing page and the contact page) render as upright Cinzel small-caps, flattening the intended hierarchy identically on mobile and desktop. NEEDS-EYES only for how it looks; that the class resolves to nothing is confirmed in the built CSS.

**Fix (S effort):** Global find-and-replace `accent-accent-italic` -> `accent-italic` across src/ (15 occurrences). Consider adding a class-existence check to the verify pipeline since typecheck/eslint cannot catch unknown class strings.

### [Low] No tel:/mailto: anchors anywhere while formatDetection.telephone is disabled — phone numbers will never be tappable (BY-DESIGN-ADJACENT)

**Where:** `src/components/ui/primitives.tsx:53`

**Evidence:** Grep for `tel:|mailto:` across src/ matches only the protocol check in primitives.tsx:161 — zero actual links. layout.tsx:144 sets `formatDetection: { telephone: false }`, suppressing iOS auto-linking. Telephone/email render as bare text via `<Fact field={business.telephone} />` in Footer.tsx:123, contact/page.tsx:64, Appointment.tsx:74, request-a-valuation/page.tsx:52. ValuationForm.tsx:269 and 806-810 direct static-build users to "contact Pureweight by telephone" as the fallback path.

**Impact:** Placeholder values today are by design and not the defect. The gap: the moment the client verifies a real number, every surface — including the preview build's own 'sending is disabled' fallback instruction — renders it as inert text a mobile user must memorise and retype, on the business's primary conversion fallback channel.

**Fix (S effort):** Use Fact's existing render prop at the four call sites: `<Fact field={business.telephone} render={(v) => <a className="underline underline-offset-4 hover:text-gold-high" href={`tel:${v.replace(/[^+\d]/g, '')}`}>{v}</a>} />` and the mailto: equivalent for business.email. Placeholder state is untouched — render only runs on verified values.

*Verifier:* Evidence holds: zero tel:/mailto: hrefs in src (only the protocol check in primitives.tsx:161); layout.tsx:144 sets formatDetection telephone/address/email all false; the four Fact call sites render bare text. However business.telephone and business.email are still pending() placeholders (site.ts:112-113), so today nothing renders as a phone number at all — zero current user impact on the noindex preview. This is a latent gap on the verified render path, adjacent to deliberate decision 1 but not covered by it. The Fact render-prop fix is valid: Fact returns the Placeholder chip when unverified and only invokes render on verified values, so it fabricates nothing. Downgraded Medium -> Low for zero present impact.

### [Low] No valuation CTA in the header on phones, contradicting the component's stated guarantee; no persistent CTA over 12 homepage sections

**Where:** `src/components/chrome/Nav.tsx:136`

**Evidence:** Nav.tsx:136 — the CTA Link is `hidden min-h-11 ... sm:inline-flex`, i.e. absent below 640px. Nav.tsx:22-23's own comment claims 'a valuation CTA that is reachable at every breakpoint without opening a menu.' On <640px the persistent header holds only monogram + hamburger; CTAs otherwise appear in the hero, mid-page Appointment form, and finale of a 12-section page (page.tsx:44-60).

**Impact:** BY-DESIGN-ADJACENT territory (mid-page form placement is deliberate and good), but on phones the always-available conversion path requires hamburger -> menu CTA, and the code's accessibility rationale is factually untrue at the breakpoint where it matters most. Between hero and Appointment (~5 sections of scroll) there is no visible CTA.

**Fix (M effort):** Either add a compact phone variant (e.g. shorten label to 'Valuation' and show from base: `inline-flex px-3 text-[0.56rem] sm:px-5 sm:text-[0.64rem]`), or correct the comment and consider a dismissible sticky bottom CTA for phone viewports. Also consider raising the adjacent monogram link from h-10 (40px) to min-h-11 for consistency with the 44px standard the file itself documents.

*Verifier:* Reproduced: Nav.tsx:136 CTA className is 'hidden min-h-11 ... sm:inline-flex' — absent below 640px, leaving only monogram (h-10 = 40px tap height) + hamburger. The file's own doc comment (lines 21-24) claims 'a valuation CTA that is reachable at every breakpoint without opening a menu', which is false below sm. Homepage is 12 sections (page.tsx Hero..FinalBalance) with CTAs at hero (Hero.tsx:98), mid-page Appointment, and finale, so Low is calibrated correctly — this is a consistency/comment-contract issue, not a conversion emergency on a noindex preview. Both proposed fixes are safe.

### [Low] Full-screen menu pays for backdrop-blur-lg behind a 97%-opaque fill (NEEDS-EYES)

**Where:** `src/components/chrome/Nav.tsx:186`

**Evidence:** Nav.tsx:186 — panel className includes `bg-void/97 backdrop-blur-lg`. A blur sampled through a 97% opaque near-black fill is visually near-imperceptible, but backdrop-filter forces a full-viewport blur pass on the GPU while the menu is open.

**Impact:** On low-end Android GPUs (already sharing budget with three r170 canvases beneath), this is wasted compositing work for an effect that cannot be seen through the fill. Cannot profile without a device — flagged NEEDS-EYES, not asserted as jank.

**Fix (S effort):** Drop `backdrop-blur-lg` from the panel (keep `bg-void/97`), or lower fill opacity to ~85% if the glass look is actually wanted and verify frame rate on a mid-range Android. The header's `backdrop-blur-md` at bg-void/82 (line 99) is visible and worth keeping.

*Verifier:* Reproduced: panel className (Nav.tsx:187) includes 'bg-void/97 backdrop-blur-lg' and backdrop-blur-lg ships in the live CSS. bg-void/97 = rgba(3,3,3,.97) leaves 3% transmission — the blur is visually near-imperceptible while still forcing a full-viewport backdrop-filter pass whenever the menu is open (cost is zero when hidden, as the panel uses hidden={!menuOpen}). Dropping the blur is safe; the frame-rate claim itself is correctly flagged NEEDS-EYES. Low severity appropriate.

### [Low] body background-attachment: fixed is ignored on iOS and historically janky on Android (NEEDS-EYES)

**Where:** `src/app/globals.css:122`

**Evidence:** globals.css:119-122 — body carries two full-viewport radial-gradients with `background-attachment: fixed;`. iOS Safari does not support fixed attachment on body (renders as scroll); some Android builds rasterize the full document height or repaint on scroll for fixed-attachment gradients.

**Impact:** Visual-only divergence on iOS: the ambient key-light gradients scroll with content instead of staying anchored, subtly changing the 'lit room' effect the comment describes; possible scroll-repaint cost on Android. Both need a device to confirm — flagged NEEDS-EYES.

**Fix (S effort):** Move the two gradients to a dedicated layer: `body::before { content:''; position: fixed; inset: 0; z-index: -1; pointer-events: none; background-image: /* same gradients */; }` — position:fixed pseudo-element behaves identically across mobile engines and drops the attachment property entirely.

*Verifier:* Reproduced: globals.css:119-122 puts two full-viewport radial-gradients plus background-attachment: fixed on body, and 'background-attachment:fixed' ships in the live CSS. iOS Safari's non-support of fixed attachment (falls back to scroll) is long-documented. I specifically audited the proposed body::before fix for a paint-order trap: a negative-z fixed pseudo could be hidden behind an opaque ancestor background, but here the html rule (globals.css:84) sets no background, so body's background-color propagates to the canvas and paints beneath the pseudo — the fix renders the gradients correctly above the void color and below content. Behavioral verification on device remains NEEDS-EYES as stated. Low severity appropriate.


## Infrastructure, CI & Analytics — 75/100

> Live Pages preview is healthy and correctly locked down (HTTP/2 h2 at the Fastly edge, gzip, noindex meta + robots Disallow all enforced by CI env, zero third-party scripts, only a first-party sessionStorage loader flag), and CI is genuinely gated: npm ci + full verify suite (typecheck/eslint/geometry/contrast/budget) runs before every deploy under a correct non-cancelling concurrency group, with generated assets (craquelure.png, logo) committed and .gitignore covering .next/out/.env*. The real gaps are operational, not build-quality: the custom-domain go-live path (basePath /pw removal, NEXT_PUBLIC_SITE_URL, CNAME, indexing flip) is documented nowhere in the repo and basePath is structurally coupled to the GITHUB_PAGES flag, there is no monitoring or documented rollback, and CI lacks a .next build cache.

### [Medium] Custom-domain migration undocumented; basePath '/pw' hard-coupled to GITHUB_PAGES flag (go-live time-bomb)

**Where:** `next.config.ts:18`

**Evidence:** next.config.ts:18 `const basePath = isPages ? '/pw' : undefined;` (isPages = GITHUB_PAGES==='true'); pages.yml:56 hardcodes NEXT_PUBLIC_SITE_URL: 'https://pureweightofficial.github.io/pw'. `grep -rniE "custom domain|CNAME|basePath" README.md docs/ CONTENT-PLACEHOLDERS.md` returns zero hits — only README.md:198 mentions NEXT_PUBLIC_SITE_URL, with no domain-migration steps. `git ls-files | grep CNAME` empty. GitHub Pages project sites served via a custom domain are served from the domain root, so a build with basePath '/pw' would 404 every /_next asset and internal link the day a custom domain is attached to this same repo/workflow.

**Impact:** Whoever attaches the client's production domain to this Pages setup (or clones the workflow for launch) will ship a fully broken site — every script, stylesheet and route prefixed /pw resolves 404 at domain root. Nothing in the repo warns about this, and the same undocumented go-live also requires flipping NEXT_PUBLIC_SITE_URL, adding a CNAME file to the artifact, DNS records, and the NEXT_PUBLIC_ALLOW_INDEXING opt-in.

**Fix (S effort):** Two parts. (1) Decouple path from host in next.config.ts: `const basePath = isPages ? (process.env.PAGES_BASE_PATH ?? '/pw') || undefined : undefined;` so a custom-domain Pages deploy can set PAGES_BASE_PATH='' in the workflow without code changes. (2) Add a DEPLOYMENT.md 'Custom domain go-live' checklist: set custom domain in Pages settings + emit CNAME file into out/ in the workflow (`echo www.example.com > out/CNAME` after the build step); DNS CNAME www -> pureweightofficial.github.io (+ apex A/AAAA to GitHub Pages IPs); set PAGES_BASE_PATH=''; set NEXT_PUBLIC_SITE_URL to the real https origin; leave NEXT_PUBLIC_ALLOW_INDEXING=false until CONTENT-PLACEHOLDERS.md is cleared, then flip to 'true'; note OG image content-type fixes itself once off the github.io accepted-known list.

*Verifier:* Evidence fully reproduced: next.config.ts:18 `const basePath = isPages ? '/pw' : undefined;`, pages.yml:56 hardcodes the github.io/pw URL, grep for custom domain/CNAME/basePath across README.md and CONTENT-PLACEHOLDERS.md returns nothing (docs/ does not exist), no CNAME tracked, README:198 is the only SITE_URL mention with no migration steps. Pages behavior claim is correct (custom domains serve project sites from the domain root, so '/pw' assets would 404). The fix is safe: `(process.env.PAGES_BASE_PATH ?? '/pw') || undefined` collapses '' to undefined correctly, and next.config.ts:30 derives NEXT_PUBLIC_BASE_PATH from the same constant so src/lib/asset.ts stays in sync with no further change. Severity downgraded High->Medium: the repo explicitly frames Pages as a preview and the node target as production (next.config.ts header comment, pages.yml header), so custom-domain-on-Pages is a plausible but undocumented-and-unplanned path with zero current impact on a noindex preview. The genuine gap is the missing DEPLOYMENT.md go-live checklist.

### [Medium] No monitoring: no uptime check, no error reporting, no deploy-failure alerting beyond GitHub default email

**Where:** `.github/workflows/pages.yml:26`

**Evidence:** `git ls-files | grep -iE 'sentry'` empty; `grep -rniE 'sentry|uptime|monitor' README.md docs/ .github/` matches only README.md:101 (drei PerformanceMonitor, a WebGL frame-timing tool, unrelated). pages.yml contains build+deploy jobs only — no scheduled health check workflow exists in .github/workflows/ (single file: pages.yml).

**Impact:** Roadmap gap, not a preview defect: nobody is notified if the Pages URL starts 404ing/serving stale content, and at node-target launch a broken /api/valuation (the business's only lead channel, which deliberately 503s when unconfigured) would fail silently until a human notices.

**Fix (S effort):** Now (preview, free, ~15 min): UptimeRobot or a scheduled GitHub Actions workflow (`on: schedule: cron '*/30 * * * *'` running `curl -fsS https://pureweightofficial.github.io/pw/ >/dev/null`) that fails loudly to email/Slack. At node launch: add @sentry/nextjs (client + route-handler errors, ~30 min), an uptime check against the production origin, and a synthetic check that POSTs an invalid payload to /api/valuation expecting 422 (proves the route is alive without creating fake enquiries).

*Verifier:* Reproduced: .github/workflows/ contains only pages.yml (build+deploy jobs, no schedule trigger), `git ls-files | grep -i sentry` empty, the sole 'monitor' hit is README:101's drei PerformanceMonitor (WebGL frame-timing, unrelated to ops monitoring). Not covered by deliberate decision #5, which is about analytics/consent tooling, not uptime/error monitoring. Phased fix is safe and correct; note the synthetic POST check expecting 422 doubles as a webhook-config alarm since the route returns 503 when VALUATION_WEBHOOK_URL is unset (decision #3), which is desirable alerting behavior, not a conflict. Medium is fair for an infra audit given production launch is the stated goal.

### [Low] Rollback procedure undocumented; GitHub Pages retains only the latest deployment

**Where:** `README.md:308`

**Evidence:** actions/deploy-pages@v4 (pages.yml:78) replaces the single live Pages deployment on every run — Pages has no version history or instant-rollback primitive. README 'Known limitations' (line 308) and the workflow comments document the static-host constraints but say nothing about how to roll back a bad deploy; no DEPLOYMENT.md exists (`ls *.md` = CONTENT-PLACEHOLDERS.md, README.md).

**Impact:** A bad merge to main auto-deploys (on: push branches [main]) and the previous good version is gone from the host; under pressure, an operator without a written procedure will improvise.

**Fix (S effort):** Document in DEPLOYMENT.md: rollback = Actions tab -> select the last good 'Deploy preview to GitHub Pages' run -> 'Re-run all jobs' (rebuilds that commit via actions/checkout of the merge SHA and re-publishes; upload-pages-artifact artifacts also persist ~90 days), or `git revert <bad-sha> && git push` for an auditable rollback. Note that workflow_dispatch (pages.yml:14) already allows redeploying main on demand.

*Verifier:* Reproduced: actions/deploy-pages@v4 at pages.yml:78 replaces the single live Pages deployment, workflow_dispatch at pages.yml:14, README 'Known limitations' (~line 309) covers static-host constraints but not rollback, and no DEPLOYMENT.md exists (only CONTENT-PLACEHOLDERS.md and README.md). The primary fix mechanism is valid: 'Re-run all jobs' re-executes the build from the original commit SHA and republishes, and `git revert` works. One factual error must be corrected before documenting: actions/upload-pages-artifact defaults to 1-day retention (its retention-days input default), NOT ~90 days, and workflow re-runs are only offered for ~30 days after the original run — so the doc must present re-run as time-limited and `git revert && git push` as the durable rollback, not rely on artifact persistence.


---

## Appendix A — Refuted findings (kept for honesty)

- **(performance)** Cold-connection TTFB from South Asia is 1.6-2.1s; HTTP/2 unverifiable with local tooling — *refuted:* The TTFB evidence does not hold on re-measurement. From the same Fastly Delhi edge (cache-del pop), a fresh TCP+TLS connection measured ttfb=0.128s (tcp=0.044, tls=0.091) and a warm rerun 0.219s — matching the auditor's own warm numbers (0.209-0.350s) but contradicting the 1.6-2.1s cold claim. The auditor's inflated tcp=0.601/tls=0.964 handshake times indicate transient local network congestion and/or edge-cache MISS at measurement time, not a site characteristic; presenting it as "cold-connection TTFB from South Asia is 1.6-2.1s" is a misread of one-off variance. The h2 portion reproduces (curl 8.19.0 Schannel build rejects --http2) but describes the audit machine's tooling, not the site, and carries no defect or action.
- **(code-quality)** setSceneQuality runs in a parent passive effect that cannot fire before the child Canvas mounts — *refuted:* The child-effects-before-parent-effects ordering is real, but the conclusion is wrong: in R3F 9.6.1 the Canvas mount commit does NOT render the scene graph. Canvas only calls root.render() from a layout effect when containerRect.width/height > 0; react-use-measure initializes bounds to all zeros, attaches its ResizeObserver in a passive effect, gates setState behind a mounted flag also set in a passive effect, and Canvas passes debounce:{scroll:50} which is the callback the ResizeObserver is constructed with — so the first three-reconciler render (where antiqueGold()/goldRoughnessMap() are actually called, e.g. BalanceScale.tsx:179-193 during reconciler render) happens in a later task, ≥50ms after mount. React flushes pending passive effects before beginning the re-render that triggers root.render, so SceneShell.tsx:188 setSceneQuality(capability.tier) is guaranteed to run first, and root.render is additionally deferred past an awaited configure(). The quality.ts:25 'high' default is never baked into any built material. The proposed render-phase module-singleton write is also an unnecessary side-effect-during-render anti-pattern.
- **(code-quality)** Shared-resource refcount dispose is not safe when one scene unmounts and another mounts in the same commit — *refuted:* The premise that scene B 'has already committed and built its materials from those caches' before A's passive-phase release is false. B's Canvas commit only mounts DOM; the three-reconciler render that calls the geometry/material/texture factories is deferred until react-use-measure reports a nonzero size (ResizeObserver attached in a passive effect, callback debounced 50ms, updates gated behind a mounted flag set in a passive effect) and until after an awaited root.configure(). So the worst same-commit ordering is: A release -> dispose+clear caches -> B retain (count 1) -> a later task: B renders and rebuilds fresh resources into the cleared caches with a correct refcount. No use-after-dispose, no orphaned resources — just a cache rebuild, which is the designed behavior when the last scene unmounts (SceneShell guarantee 5). In practice count also rarely reaches 0 mid-page because the eager hero stays mounted.
- **(code-quality)** SceneCursor hit-tests with querySelectorAll + getBoundingClientRect on every pointermove — *refuted:* The evidence itself reproduces (SceneCursor.tsx:83-97 does querySelectorAll + per-surface gBCR in the raw pointermove handler), but both proposed fixes would break the feature. (1) Caching surface elements 'once on mount' is unsafe: SceneCursor is mounted in the persistent root layout (layout.tsx:209) while the [data-webgl-surface] nodes are per-route (Hero.tsx:57, AssayExperience.tsx:65, FinalBalance.tsx:34), so the cache goes stale on every client-side navigation — detached nodes report zero rects and the cursor dies site-wide; rects cached on scroll/resize also go stale on layout mutations that fire neither event. (2) Moving the hit-test into 'the existing tick rAF' is circular: tick (lines 58-67) only runs while `visible` is already true, and visibility is decided by the hit-test, so as specified the ring could never appear. The measured cost is also negligible — an attribute query plus gBCR on exactly three elements per event, on a site whose perf budgets pass. Real but trivial inefficiency with only regression-inducing fixes offered.
- **(code-quality)** Enquiry XHR is never aborted on unmount and its handlers setState unconditionally — *refuted:* The code matches the evidence (ValuationForm.tsx:291-329: local xhr, no abort cleanup, no mounted guard), but neither half is a defect and the fix would cause real harm. In React 18/19 setState on an unmounted component is a documented silent no-op — no warning, no leak; the XHR and its closures are GC'd on completion. More importantly, abort-on-unmount would cancel an in-flight enquiry POST when a visitor submits and then immediately navigates — silently dropping a real sales lead that the current code delivers to the webhook server-side. For a lead-generation form, letting the request complete after unmount is the correct behavior, not an oversight (and on the static Pages build the whole path is disabled by design, decision #2/#3).
- **(infra-analytics)** CI persists npm cache but not .next/cache; node version pinned to major only — *refuted:* The raw facts hold (no actions/cache step; node-version: 24 floats across minors) but the causal claim and the fix do not. The build is `next build --turbopack` on Next 15.5.22, and Turbopack has no persistent on-disk compiler cache in this configuration: empirically, the repo's 195M .next/cache/webpack was last written Jul 29 01:55 by an earlier non-Turbopack run, while the newest Turbopack build (BUILD_ID mtime Jul 30 11:43) wrote zero files under it (`find .next/cache/webpack -newer .next/BUILD_ID` count = 0). Caching .next/cache in CI would therefore upload/restore ~200MB of dead webpack cache plus eslint/tsbuildinfo crumbs every run with no build-time benefit — a net CI slowdown, i.e. the claimed fix does not fix the claimed problem and mildly harms. The leftover .nvmrc suggestion is a trivial nicety that cannot sustain the finding on its own.

## Appendix B — By-design (matches a documented deliberate decision)

- **(security)** A05/BY-DESIGN-ADJACENT: Pages deployment is framable — no fix exists on a static host — Deliberate decision 2: GitHub Pages is a static host with no server security headers, accepted while the preview is noindex. Evidence is accurate (XFO is node-only at next.config.ts:67 and absent from live Pages headers; CSP frame-ancestors via <meta http-equiv> is ignored per the CSP spec), but unlike the Referrer-Policy finding there is NO spec-supported non-header delivery for clickjacking defence, so no genuine gap exists within the decision — the finding's own remediation is 'accept'. The node target is already covered by XFO SAMEORIGIN plus the proposed frame-ancestors from finding 1. The optional frame-busting snippet is correctly labelled weak and optional; not required.
- **(infra-analytics)** BY-DESIGN-ADJACENT: Pages CDN serves hashed assets with max-age=600 (no immutable) and gzip only (no brotli) — Deliberate decision #2 (GitHub Pages is a static host with platform-fixed behavior, accepted while noindex). Evidence independently reproduced exactly: /pw/_next/static/chunks/turbopack-431f3712ec9581e8.js returns Cache-Control: max-age=600, Content-Encoding: gzip, ETag W/"6a6ae091-2687", Via: 1.1 varnish, X-Served-By: cache-del-* (Fastly), same 600s policy as the HTML; openssl -alpn h2 negotiated 'ALPN protocol: h2'. GitHub Pages offers no header customization, so nothing is actionable now; the documentation-only fix (record the production-host requirement for immutable caching + brotli in DEPLOYMENT.md) is a harmless genuine-gap note within the design decision.
- **(infra-analytics)** BY-DESIGN-ADJACENT: analytics/consent posture verified clean — no trackers, no cookies, sessionStorage only — Deliberate decision #5 (no analytics/consent tooling pending client decision — roadmap, not defect). Posture independently verified as claimed: all 13 <script src> tags in served HTML are same-origin /pw/_next/static/chunks/*; the only Web Storage use in src/ is sessionStorage key 'pw:loader:v1' in src/components/chrome/Loader.tsx (const at line 29, getItem/setItem at 46/57); no document.cookie or localStorage anywhere in src/; live page carries <meta name="robots" content="noindex, nofollow, nocache"/> and /pw/robots.txt is Disallow: / (matching decision #1). One minor evidence inaccuracy: 'clarity' also matches the tracker regex as body prose ('Every exchange deserves clarity'), not only 'plausible' — the no-trackers conclusion is unchanged. The proposed single roadmap line is fine and consistent with decision #5's 'deploy together, never GA alone' posture.

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

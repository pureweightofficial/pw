import type { NextConfig } from 'next';

/**
 * Two deployment targets, one codebase.
 *
 * DEFAULT — a Node server (Vercel, Cloudflare, a VPS). Everything works,
 * including the valuation enquiry endpoint.
 *
 * GITHUB_PAGES=true — a fully static export for GitHub Pages. Pages serves
 * files, not functions, so `/api/valuation` cannot exist there. The CI workflow
 * moves that route aside before building, and the form is switched into a
 * read-only state that says so plainly rather than posting into a void.
 * See .github/workflows/pages.yml.
 */
const isPages = process.env.GITHUB_PAGES === 'true';

/**
 * Sub-path the site is served from.
 *
 * DEFAULTS, overridable without code edits (see docs/GO-LIVE.md):
 *   node target        -> no basePath
 *   GITHUB_PAGES=true  -> '/pw' (the repo-name sub-path of *.github.io/pw)
 *   custom domain on Pages -> set BASE_PATH='' in the workflow; a custom domain
 *     serves from the origin root and '/pw' would 404 every asset — this
 *     coupling previously existed only as an unwritten assumption.
 */
const basePath = process.env.BASE_PATH !== undefined
  ? (process.env.BASE_PATH || undefined)
  : isPages
    ? '/pw'
    : undefined;

/**
 * SINGLE SOURCE OF TRUTH for the base path.
 *
 * Next applies `basePath` to its own routing, but `next/image` with
 * `unoptimized: true` emits raw `src` values untouched — so client code needs
 * the prefix too (see src/lib/asset.ts). Deriving the public env var from the
 * same constant here means the two cannot drift; previously the CI workflow
 * hardcoded '/pw' a second time, and changing one without the other would have
 * silently reintroduced the 404 class asset.ts exists to prevent.
 */
process.env.NEXT_PUBLIC_BASE_PATH = basePath ?? '';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  transpilePackages: ['three'],

  // This project sits inside a workspace that has its own lockfile higher up.
  // Pinning the trace root stops Next inferring the parent directory and
  // dragging unrelated sibling projects into the build trace.
  outputFileTracingRoot: process.cwd(),

  ...(isPages
    ? {
        output: 'export' as const,
        basePath,
        // Trailing slashes make Pages' directory-index routing resolve cleanly.
        trailingSlash: true,
        // No image optimiser exists on a static host.
        images: { unoptimized: true },
      }
    : {
        images: { formats: ['image/avif', 'image/webp'] as const },
      }),

  // Security headers are served by the host. A static export has no server to
  // set them, so Next rejects this config entirely when exporting — on Pages
  // they have to be applied at the CDN/proxy layer instead.
  ...(isPages
    ? {}
    : {
        async headers() {
          return [
            {
              source: '/:path*',
              headers: [
                /**
                 * The site is fully self-contained — no third-party scripts,
                 * fonts, frames or beacons at runtime — so a tight CSP is
                 * cheap. 'unsafe-inline' in script-src exists for exactly two
                 * inline blocks (the reveal bootstrap and JSON-LD) plus Next's
                 * own hydration payload; in style-src for styled attributes.
                 * blob: workers cover R3F internals. If analytics is ever
                 * added, its origins must be appended here deliberately.
                 */
                {
                  key: 'Content-Security-Policy',
                  value: [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline'",
                    "style-src 'self' 'unsafe-inline'",
                    "img-src 'self' data: blob:",
                    "font-src 'self'",
                    "connect-src 'self'",
                    "worker-src 'self' blob:",
                    "object-src 'none'",
                    "base-uri 'self'",
                    "form-action 'self'",
                    "frame-ancestors 'self'",
                  ].join('; '),
                },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
              ],
            },

            /**
             * CACHING — the fix for "I land and see the old version first".
             *
             * GitHub Pages serves EVERYTHING with `Cache-Control: max-age=600`,
             * including the HTML. So for ten minutes after a deploy a returning
             * visitor gets the previous document out of browser cache, and that
             * document references the previous content-hashed chunks — which are
             * also still cached. The result is a completely coherent OLD SITE,
             * which is exactly what it looks like: the old design, then the new
             * one on the next load. Nothing is broken; the browser is doing what
             * it was told.
             *
             * Pages cannot be configured, so this is unfixable there and is a
             * genuine reason not to run production on it. On a node host these
             * two rules resolve it:
             */
            {
              // Documents must revalidate every time. `no-cache` does NOT mean
              // "do not store" — it means "store, but check with the server
              // before reusing", so a deploy is picked up on the next
              // navigation while unchanged pages still answer 304.
              source: '/:path*',
              headers: [{ key: 'Cache-Control', value: 'no-cache' }],
            },
            {
              // Build output is content-hashed: a changed file gets a changed
              // name, so the old one can never be served in error. It is
              // therefore safe to cache permanently, and `immutable` stops the
              // browser revalidating it at all.
              source: '/_next/static/:path*',
              headers: [
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;

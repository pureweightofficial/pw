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

/** Repo name, because Pages serves project sites from a sub-path. */
const basePath = isPages ? '/pw' : undefined;

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
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;

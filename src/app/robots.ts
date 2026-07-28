import type { MetadataRoute } from 'next';
import { allowIndexing, brand } from '@/lib/site';

// Required by `output: 'export'`, harmless on a server build — this route has
// no request-time dependencies, so it is generated once at build.
export const dynamic = 'force-static';


export default function robots(): MetadataRoute.Robots {
  const base = brand.url.replace(/\/$/, '');

  // Staging and preview deployments refuse everything. See `allowIndexing`.
  if (!allowIndexing) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        /**
         * ONLY the API is blocked here.
         *
         * The unwritten legal shells and the insights index are excluded from
         * search by a `noindex` robots meta tag instead — deliberately, because
         * blocking them in robots.txt would be self-defeating: a crawler that
         * is not allowed to fetch the page never sees the noindex on it, and
         * the URL can still surface in results as a bare, untitled link.
         *
         * Disallow blocks crawling. Noindex blocks indexing. Wanting the second
         * means permitting the first.
         */
        disallow: ['/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

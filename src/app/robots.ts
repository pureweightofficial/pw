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
         * ONLY the API and the keeper are blocked here.
         *
         * The unwritten legal shells and the insights index are excluded from
         * search by a `noindex` robots meta tag instead — deliberately, because
         * blocking them in robots.txt would be self-defeating: a crawler that
         * is not allowed to fetch the page never sees the noindex on it, and
         * the URL can still surface in results as a bare, untitled link.
         *
         * Disallow blocks crawling. Noindex blocks indexing. Wanting the second
         * means permitting the first.
         *
         * The keeper (the owner's admin panel at /keeper/) gets BOTH: it is a
         * static file whose HTML carries its own noindex meta, and there is
         * nothing on it worth a crawler's time under any circumstances — it
         * is a login screen. The usual trade-off above is about pages whose
         * absence from results matters more than their contents; this one has
         * no contents.
         */
        disallow: ['/api/', '/keeper/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

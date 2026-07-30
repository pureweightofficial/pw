import type { MetadataRoute } from 'next';
import { brand, canonicalPath } from '@/lib/site';

// Required by `output: 'export'`, harmless on a server build — this route has
// no request-time dependencies, so it is generated once at build.
export const dynamic = 'force-static';


/**
 * SITEMAP
 *
 * Only pages with real, indexable content. The legal shells and the insights
 * index are `noindex` until they are written, so listing them here would be
 * asking search engines to crawl pages we have simultaneously told them to
 * ignore.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = brand.url.replace(/\/$/, '');
  const lastModified = new Date();

  // canonicalPath appends the trailing slash on the Pages target, where every
  // slashless URL 301s — a sitemap full of redirects wastes crawl budget and
  // mismatches the canonicals.
  return [
    { url: `${base}${canonicalPath('/')}`, lastModified, changeFrequency: 'monthly' as const, priority: 1 },
    { url: `${base}${canonicalPath('/request-a-valuation')}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${base}${canonicalPath('/faq')}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${base}${canonicalPath('/contact')}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.8 },
  ];
}

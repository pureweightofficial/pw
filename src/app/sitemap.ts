import type { MetadataRoute } from 'next';
import { brand } from '@/lib/site';

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

  return [
    { url: `${base}/`, lastModified, changeFrequency: 'monthly', priority: 1 },
    {
      url: `${base}/request-a-valuation`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    { url: `${base}/faq`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/contact`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
  ];
}

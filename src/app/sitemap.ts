import type { MetadataRoute } from 'next';
import { brand, canonicalPath } from '@/lib/site';
import { publishedArticles } from '@/lib/insights';

// Required by `output: 'export'`, harmless on a server build — this route has
// no request-time dependencies, so it is generated once at build.
export const dynamic = 'force-static';


/**
 * SITEMAP
 *
 * Only pages with real, indexable content. The legal shells stay out while
 * they are `noindex` — listing them would ask search engines to crawl pages
 * we have simultaneously told them to ignore.
 *
 * The insights index and every published article ARE listed now: articles are
 * authored and approved by the owner through the Keeper, so their existence
 * in the content directory is itself the approval. Drafts never appear —
 * publishedArticles() excludes them at the source, the same filter the pages
 * build from, so the sitemap cannot disagree with the site.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = brand.url.replace(/\/$/, '');
  const lastModified = new Date();

  const articles = publishedArticles().map((article) => ({
    url: `${base}${canonicalPath(`/insights/${article.slug}`)}`,
    lastModified: new Date(article.date),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }));

  // canonicalPath appends the trailing slash on the Pages target, where every
  // slashless URL 301s — a sitemap full of redirects wastes crawl budget and
  // mismatches the canonicals.
  return [
    { url: `${base}${canonicalPath('/')}`, lastModified, changeFrequency: 'monthly' as const, priority: 1 },
    // The four topic pages behind the nav — each standalone, 800+ words.
    { url: `${base}${canonicalPath('/what-we-buy')}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${base}${canonicalPath('/how-it-works')}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${base}${canonicalPath('/purity-and-weight')}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${base}${canonicalPath('/about')}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${base}${canonicalPath('/faq')}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${base}${canonicalPath('/contact')}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${base}${canonicalPath('/insights')}`, lastModified, changeFrequency: 'weekly' as const, priority: 0.7 },
    ...articles,
  ];
}

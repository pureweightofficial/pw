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
/**
 * The most recent date any Keeper-editable content file claims.
 *
 * Falls back to build time when nothing carries a date — which is honest in a
 * different way: an unknown modification date is better represented as "now"
 * than as a fabricated older one, because claiming a page is staler than it is
 * asks a crawler to come back less often.
 */
function contentLastModified(): Date {
  const dates = publishedArticles()
    .map((article) => new Date(article.date))
    .filter((d) => !Number.isNaN(d.getTime()));

  if (dates.length === 0) return new Date();
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = brand.url.replace(/\/$/, '');

  /*
    EVERY STATIC PAGE USED TO CLAIM IT CHANGED ON EVERY DEPLOY.

    `new Date()` is build time, so a deploy that touched one CSS variable
    rewrote <lastmod> on all eight static URLs to that minute. To a crawler
    that is a site where everything changes constantly and nothing can be
    trusted to stay put — which is the opposite of the signal a business page
    that has not been edited in a month should send, and it wastes the crawl
    budget of a site with twelve pages.

    There is no honest per-page modification date available here: the content
    lives in JSON edited through the Keeper, and Git history is not readable
    at build time on Vercel. So rather than invent per-page precision, the
    static pages share ONE date that changes only when the content does — a
    hash-free but honest approximation, derived from the content files'
    own edit dates where they carry one.

    Articles keep their real published date, which they do carry, and that is
    already handled below.
  */
  const lastModified = contentLastModified();

  const articles = publishedArticles().map((article) => ({
    url: `${base}${canonicalPath(`/insights/${article.slug}`)}`,
    // Guarded: an Invalid Date here does not fail this build, it fails EVERY
    // build until the JSON is hand-edited, because Next calls toISOString()
    // on whatever this returns. The validators now refuse impossible dates,
    // but the sitemap must not be the layer that turns a bad commit into a
    // bricked deploy pipeline.
    lastModified: Number.isNaN(new Date(article.date).getTime())
      ? lastModified
      : new Date(article.date),
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

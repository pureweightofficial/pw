import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Eyebrow, Section } from '@/components/ui/primitives';
import { brand, canonicalPath, ogFor } from '@/lib/site';
import { articleBySlug, publishedArticles, renderBody } from '@/lib/insights';

/**
 * AN INSIGHT ARTICLE — authored by the owner in the Keeper, prerendered here
 * at build time. No client-side markdown, no runtime fetch: by the time a
 * visitor arrives this is plain HTML like every other page.
 *
 * Article JSON-LD is emitted because every field in it is real: the owner
 * wrote the headline and body, the date is the file's own stated date, and
 * the publisher is the business itself. This is the one structured-data type
 * on the site that never touches the Verifiable guard, because an article is
 * its author's words rather than a checkable business fact.
 */

export function generateStaticParams() {
  return publishedArticles().map((a) => ({ slug: a.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: canonicalPath(`/insights/${article.slug}`) },
    openGraph: ogFor({
      title: `${article.title} — ${brand.name}`,
      description: article.summary,
      path: `/insights/${article.slug}`,
    }),
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.summary,
    datePublished: article.date,
    author: { '@type': 'Organization', name: article.author },
    publisher: { '@type': 'Organization', name: brand.name },
  };

  return (
    <Section material="steel" labelledBy="article-heading" className="pb-24 pt-36 lg:pb-36 lg:pt-44">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="shell">
        <div className="mx-auto max-w-3xl">
          <Eyebrow className="mb-8">Insights</Eyebrow>
          <h1
            id="article-heading"
            className="font-display text-chapter leading-tight text-ivory"
          >
            {article.title}
          </h1>
          <p className="mt-6 text-[0.68rem] tracking-[0.2em] text-ash uppercase">
            {article.author} · {article.date} · {article.readingMinutes} min read
          </p>

          <div
            className="article-body mt-14"
            // Build-time rendered from the owner's markdown, with raw HTML
            // neutralised before parsing — see renderBody in lib/insights.
            dangerouslySetInnerHTML={{ __html: renderBody(article.body) }}
          />

          <div className="mt-16 flex flex-wrap gap-4 border-t border-gold-antique/16 pt-10">
            <Link href="/insights" className="btn-ghost">
              All insights
            </Link>
            <Link href="/contact" className="btn-primary">
              <span className="relative z-10">Visit Our Shop</span>
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}

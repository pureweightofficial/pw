import type { Metadata } from 'next';
import Link from 'next/link';
import { Eyebrow, Section } from '@/components/ui/primitives';
import { insightTopics } from '@/lib/site';
import { pageMetadata } from '@/lib/seo';
import { publishedArticles } from '@/lib/insights';

export const metadata: Metadata = pageMetadata(
  'insights',
  '/insights',
  {
    title: 'Insights',
    description:
      'Plain explanations of how gold is measured and valued — purity, hallmarks, weight units, and what to expect from a professional evaluation.',
  },
  {
    /*
      Was noindex while every topic was an unwritten stub. Real articles exist
      now (authored through the Keeper), so the page has substance — but the
      SITE-WIDE indexing switch still rules: robots.ts keeps everything noindex
      until NEXT_PUBLIC_ALLOW_INDEXING is set, so flipping this early cannot
      leak a placeholder site into search.
    */
    robots: { index: true, follow: true },
  },
);

/**
 * INSIGHTS INDEX
 *
 * The topics are planned and the page is built; the articles are not written.
 *
 * Eight authoritative-sounding articles about gold valuation could be generated
 * in minutes, and publishing them under a real trader's name — unreviewed,
 * possibly contradicting how they actually work — would be putting words in
 * their mouth on the subject their customers trust them about most.
 *
 * So: honest scaffolding, `noindex` until it has substance, and one genuinely
 * useful piece of information on the page that does not depend on the client.
 */
export default function InsightsPage() {
  const articles = publishedArticles();
  return (
    <Section material="steel" labelledBy="insights-heading" className="pb-24 pt-36 lg:pb-36 lg:pt-44">
      <div className="shell">
        <div className="max-w-3xl">
          <Eyebrow className="mb-8">Insights</Eyebrow>
          <h1 id="insights-heading" className="font-display text-chapter font-normal text-ivory">
            Know what you hold
            <span className="accent-italic text-gold-high/90"> before you sell it</span>
          </h1>
          <p className="mt-8 max-w-xl text-lead text-ivory/72">
            Most people sell gold once or twice in a lifetime. These articles are intended to close
            the knowledge gap before the conversation starts, not after it.
          </p>
        </div>

        {articles.length > 0 ? (
          <div className="mt-16 max-w-3xl">
            <h2 className="label mb-8">Published</h2>
            <ul className="border-t border-gold-antique/16">
              {articles.map((article) => (
                <li key={article.slug} className="border-b border-gold-antique/12">
                  <Link
                    href={`/insights/${article.slug}`}
                    className="group block py-8 transition-colors"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="font-display text-2xl font-normal leading-tight text-ivory transition-colors group-hover:text-gold-high lg:text-3xl">
                        {article.title}
                      </h3>
                      <span className="text-[0.62rem] tracking-[0.2em] text-ash uppercase">
                        {article.date} · {article.readingMinutes} min read
                      </span>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ash">
                      {article.summary}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-14 inset-panel max-w-3xl p-8">
          <p className="label mb-4">Editorial status</p>
          <p className="text-sm leading-relaxed text-ivory/72">
            Articles are written and published by Pureweight through the site&apos;s own panel.
            The topics below are planned but not yet written — nothing appears here until it has
            been authored and approved by the business.
          </p>
        </div>

        <ul className="mt-16 grid gap-px overflow-hidden border border-gold-antique/14 bg-gold-antique/14 sm:grid-cols-2">
          {insightTopics.map((topic, index) => (
            <li key={topic.title} className="flex flex-col justify-between gap-8 bg-char p-8 lg:p-10">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[0.58rem] tracking-[0.22em] text-gold-antique uppercase">
                    {topic.category}
                  </span>
                  <span className="font-display text-2xl font-normal text-gold-antique/75">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h2 className="mt-6 font-display text-2xl font-normal leading-tight text-ivory lg:text-3xl">
                  {topic.title}
                </h2>
              </div>

              <span className="inline-flex items-center gap-2 self-start border border-dashed border-gold-antique/30 px-2.5 py-1 text-[0.56rem] tracking-[0.16em] text-gold-antique uppercase">
                <span aria-hidden="true">◇</span>
                Article pending
              </span>
            </li>
          ))}
        </ul>

        {/*
          One thing worth reading, available today. These are trade-standard
          definitions — verifiable, not specific to this business, and not a
          claim about how Pureweight prices anything.
        */}
        <div className="mt-20 max-w-3xl">
          <h2 className="font-display text-3xl font-normal text-ivory">
            In the meantime — three things worth knowing
          </h2>

          <dl className="mt-10 space-y-10">
            <div>
              <dt className="text-lg font-medium text-gold-high/90">Carat is a fraction of 24</dt>
              <dd className="mt-3 text-lead text-ivory/72">
                24 carat is pure gold. 22ct is 22 parts gold in 24, usually written as 916 parts per
                thousand. 18ct is 750, 14ct is 585 and 9ct is 375. The remainder is alloy — copper,
                silver, zinc — and it is not gold, which is why a heavy 9ct chain can be worth less
                than a light 22ct one.
              </dd>
            </div>

            <div>
              <dt className="text-lg font-medium text-gold-high/90">
                A troy ounce is not an ounce
              </dt>
              <dd className="mt-3 text-lead text-ivory/72">
                Precious metals are weighed in troy ounces: 31.1035 grams, against 28.3495 grams for
                the avoirdupois ounce used for everyday goods. That is a difference of about 10 per
                cent, and it is the most common reason two people quoting the same weight appear to
                disagree.
              </dd>
            </div>

            <div>
              <dt className="text-lg font-medium text-gold-high/90">
                What is attached to the gold matters
              </dt>
              <dd className="mt-3 text-lead text-ivory/72">
                Stones, clasps, springs, solder and plating all add weight without adding gold. A
                professional evaluation separates them out rather than weighing the piece whole,
                which is why an itemised assessment and a single lump figure can differ
                considerably.
              </dd>
            </div>
          </dl>

          <div className="mt-14">
            <Link href="/contact" className="btn-primary">
              <span className="relative z-10">Visit Our Shop</span>
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}

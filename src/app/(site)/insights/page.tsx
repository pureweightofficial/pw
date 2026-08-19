import type { Metadata } from 'next';
import Link from 'next/link';
import { Eyebrow, Section } from '@/components/ui/primitives';
import { allowIndexing } from '@/lib/site';
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
      THIS PAGE ONCE ANNOUNCED ITSELF AS INDEXABLE WHILE THE REST OF THE SITE
      WAS HIDDEN. The old comment here reasoned that robots.txt would hold the
      line regardless — and on this deployment that reasoning was simply false.

      The site ships to GitHub Pages under basePath /pw, so robots.ts emits at
      /pw/robots.txt. Crawlers only ever read robots.txt at the ORIGIN root,
      and pureweightofficial.github.io/robots.txt is a 404 belonging to the
      user site, not to us. Measured, not assumed. The Disallow therefore
      reaches nobody, and the per-page robots meta is the ONLY control that
      works here — which made this one line the single open door on a site
      still rendering [INSERT VERIFIED TELEPHONE NUMBER].

      So it now obeys the same switch as everything else. Real articles are a
      reason to be ready to index, not a reason to index early.
    */
    robots: allowIndexing
      ? { index: true, follow: true }
      : { index: false, follow: false },
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
          <h1 id="insights-heading" className="font-display text-chapter text-ivory">
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
                      <h3 className="font-display text-2xl leading-tight text-ivory transition-colors group-hover:text-gold-high lg:text-3xl">
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

        {/*
          The "Editorial status" panel and the planned-topics grid ("Article
          pending" x8) lived here. Retired with the placeholder chips: a page
          that lists what it has not written is advertising its gaps. Published
          articles render above; the trade-standard definitions below give the
          page real content on day one.
        */}

        {/*
          One thing worth reading, available today. These are trade-standard
          definitions — verifiable, not specific to this business, and not a
          claim about how Pureweight prices anything.
        */}
        <div className="mt-20 max-w-3xl">
          <h2 className="font-display text-3xl text-ivory">
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

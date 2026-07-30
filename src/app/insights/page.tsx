import type { Metadata } from 'next';
import Link from 'next/link';
import { Eyebrow, Section } from '@/components/ui/primitives';
import { insightTopics, canonicalPath, ogFor } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Insights',
  description:
    'Plain explanations of how gold is measured and valued — purity, hallmarks, weight units, and what to expect from a professional evaluation.',
  alternates: { canonical: canonicalPath('/insights') },
  // Complete block per page: Next replaces openGraph wholesale rather than
  // deep-merging, so a partial one silently drops og:image/site_name/type and
  // an absent one inherits the HOMEPAGE og:url on every subpage.
  openGraph: ogFor({
    title: 'Insights — Pureweight Gold Exchange',
    description:
      'Plain explanations of how gold is measured and valued — purity, hallmarks, weight units, and what to expect from a professional evaluation.',
    path: '/insights',
  }),
  // Marked noindex until the articles exist: an index page listing eight
  // unwritten titles is a thin page, and shipping it to search would earn a
  // quality problem the site does not need.
  robots: { index: false, follow: true },
};

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
  return (
    <Section material="steel" labelledBy="insights-heading" className="pb-24 pt-36 lg:pb-36 lg:pt-44">
      <div className="shell">
        <div className="max-w-3xl">
          <Eyebrow className="mb-8">Insights</Eyebrow>
          <h1 id="insights-heading" className="font-display text-chapter font-semibold text-ivory">
            Know what you hold
            <span className="accent-italic text-gold-high/90"> before you sell it</span>
          </h1>
          <p className="mt-8 max-w-xl text-lead text-ivory/72">
            Most people sell gold once or twice in a lifetime. These articles are intended to close
            the knowledge gap before the conversation starts, not after it.
          </p>
        </div>

        <div className="mt-14 inset-panel max-w-3xl p-8">
          <p className="label mb-4">Editorial status</p>
          <p className="text-sm leading-relaxed text-ivory/72">
            The topics below are planned and the layout is complete. The articles themselves are not
            written, because content published under Pureweight&apos;s name should be reviewed and
            approved by Pureweight before it appears. Supply the copy, or approve a draft, and these
            become live articles with no further build work.
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
                  <span className="font-display text-2xl font-semibold text-gold-antique/75">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h2 className="mt-6 font-display text-2xl font-semibold leading-tight text-ivory lg:text-3xl">
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
          <h2 className="font-display text-3xl font-semibold text-ivory">
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
            <Link href="/request-a-valuation" className="btn-primary">
              <span className="relative z-10">Request a Private Valuation</span>
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}

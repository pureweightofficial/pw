import Link from "next/link";
import { Eyebrow, Section } from "@/components/ui/primitives";
import { insightTopics } from "@/lib/site";

/**
 * INSIGHTS
 *
 * The editorial layer that earns organic search visibility for the terms this
 * business should own — hallmarks, carat, troy weight, what affects value.
 *
 * The topics are planned and the cards are typeset, but the articles are not
 * written. Generating eight authoritative-sounding articles about gold
 * valuation and publishing them under a real trader's name would create
 * content the business has never reviewed and may not agree with.
 *
 * So each card is marked as pending and links to the insights index, which
 * explains the same thing. No dead links, no fabricated authority.
 */

export function Insights() {
  return (
    <Section
      id="insights"
      material="stone"
      labelledBy="insights-heading"
      className="py-24 lg:py-36"
    >
      <div className="shell">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Eyebrow className="mb-8 will-reveal">Insights</Eyebrow>
            <h2
              id="insights-heading"
              className="font-display text-chapter font-normal text-ivory will-reveal"
            >
              Know what you hold
              <span className="accent-italic text-gold-high/90">
                {" "}
                before you sell it
              </span>
            </h2>
          </div>

          <Link
            href="/insights"
            className="group inline-flex min-h-11 shrink-0 items-center gap-3 text-[0.7rem] font-medium tracking-[0.24em] text-gold-antique uppercase transition-colors duration-300 hover:text-gold-high will-reveal"
          >
            All Insights
            <span
              aria-hidden="true"
              className="block h-px w-8 bg-current transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-14"
            />
          </Link>
        </div>

        <ul className="mt-16 grid gap-px overflow-hidden border border-gold-antique/14 bg-gold-antique/14 sm:grid-cols-2 lg:grid-cols-4">
          {insightTopics.slice(0, 4).map((topic, index) => (
            <li key={topic.title} className="bg-char">
              <Link
                href="/insights"
                className="group flex h-full flex-col justify-between gap-10 p-8 transition-colors duration-500 hover:bg-iron/60 will-reveal"
              >
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[0.58rem] tracking-[0.22em] text-gold-antique uppercase">
                      {topic.category}
                    </span>
                    <span className="font-display text-2xl font-normal text-gold-antique/75">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="mt-7 font-display text-2xl font-normal leading-tight text-ivory transition-colors duration-500 group-hover:text-gold-high">
                    {topic.title}
                  </h3>
                </div>

                <span className="inline-flex items-center gap-2 self-start border border-dashed border-gold-antique/30 px-2.5 py-1 text-[0.56rem] tracking-[0.16em] text-gold-antique uppercase">
                  <span aria-hidden="true">◇</span>
                  Article pending
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

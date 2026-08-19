import Link from "next/link";
import { Eyebrow, Section } from "@/components/ui/primitives";
import { publishedArticles } from "@/lib/insights";

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

/**
 * Grid columns by article count. Indexed 1-4; the zero case never renders.
 * Written out rather than interpolated because Tailwind scans for literal
 * class strings and a template-built `lg:grid-cols-${n}` produces no CSS.
 */
const COLUMNS: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function Insights() {
  /*
    HIDE-UNTIL-VERIFIED, editorial grade. This section used to typeset four
    PLANNED topics, each stamped "Article pending" — a grid of things the site
    admits it has not done, on the homepage. The policy that removed the
    [INSERT ...] chips removes these for the same reason: absence is finished;
    a promise is a gap wearing a frame. The section returns when the first
    real article is published through the Keeper.
  */
  const published = publishedArticles();
  if (published.length === 0) return null;

  return (
    <Section
      id="insights"
      material="stone"
      labelledBy="insights-heading"
      className="py-20 lg:py-28"
    >
      <div className="shell">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Eyebrow className="mb-8 will-reveal">Insights</Eyebrow>
            <h2
              id="insights-heading"
              className="font-display text-chapter text-ivory will-reveal"
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

        {/*
          THE COLUMN COUNT FOLLOWS THE ARTICLE COUNT.

          This grid was hard-wired to four columns while the site has exactly
          one published article, so it rendered one card and three empty cells
          — and because the cells' gap colour IS the container background, the
          empty three composited into a single flat olive slab taking about
          70% of the viewport's width. Three independent design reviews each
          filed it as CRITICAL and each read it the same way: a broken image,
          a failed asset, an unfinished page.

          Nothing was broken. A four-column grid was simply asked to lay out
          one item, which is a layout bug, not a content gap — the section
          already refuses to render at all when there are no articles.
        */}
        <ul
          className={`mt-16 grid gap-px overflow-hidden border border-gold-antique/14 bg-gold-antique/14 ${COLUMNS[Math.min(published.length, 4)]}`}
        >
          {published.slice(0, 4).map((article, index) => (
            <li key={article.slug} className="flex">
            <Link
              href={`/insights/${article.slug}`}
              className={`group flex w-full flex-col justify-between gap-10 bg-char p-8 transition-colors duration-500 hover:bg-gunmetal lg:p-10 ${
                published.length === 1
                  ? "lg:flex-row lg:items-end lg:gap-16 lg:p-16"
                  : ""
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[0.58rem] tracking-[0.22em] text-gold-antique uppercase">
                    {article.tags[0] ?? "Insight"}
                  </span>
                  <span className="font-display text-2xl text-gold-antique/75">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3
                  className={`mt-7 font-display leading-tight text-ivory transition-colors duration-500 group-hover:text-gold-high ${
                    published.length === 1
                      ? "max-w-2xl text-3xl lg:text-4xl"
                      : "text-2xl"
                  }`}
                >
                  {article.title}
                </h3>
              </div>

              <span className="label-ash text-[0.6rem]">Read the article →</span>
            </Link>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

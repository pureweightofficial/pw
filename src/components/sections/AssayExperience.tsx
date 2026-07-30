'use client';

import dynamic from 'next/dynamic';
import { Eyebrow, Fact, Section } from '@/components/ui/primitives';
import { assayFactors, business } from '@/lib/site';

/**
 * PURITY AND WEIGHT — "Value is not guessed. It is measured."
 *
 * The educational centrepiece, and the section with the most potential to
 * mislead, so it is also the most tightly constrained:
 *
 *  - NO LIVE RATES. None are fetched, none are displayed, none are implied.
 *  - NO CALCULATOR. Building one would require the client's calculation method,
 *    supported metals, deductions, data source, refresh rate, currency and
 *    terms. Guessing any of those and putting a number on screen would be
 *    inventing a quotation.
 *  - THE FACTS ARE FACTS. Carat as parts per 24, millesimal fineness, the troy
 *    ounce at 31.1035g — these are trade-standard definitions, verifiable, and
 *    genuinely useful. Nothing here is specific to this business's process
 *    except where explicitly marked as pending confirmation.
 *
 * The 3D piece illustrates. The text explains. Everything a visitor needs is in
 * the text, and the canvas is `aria-hidden`.
 */

const AssayCanvas = dynamic(
  () => import('@/components/webgl/canvases').then((m) => m.AssayCanvas),
  { ssr: false },
);

export function AssayExperience() {
  return (
    <Section
      id="assay"
      scrollSection="assay"
      material="glass"
      labelledBy="assay-heading"
      className="py-24 lg:py-36"
    >
      <div className="shell">
        <div className="max-w-3xl">
          <Eyebrow className="mb-8 will-reveal">Chapter 04 — Purity &amp; Weight</Eyebrow>
          <h2
            id="assay-heading"
            className="font-display text-chapter font-semibold text-ivory will-reveal"
          >
            Value is not guessed.
            <br />
            <span className="accent-italic text-gold-high/90">It is measured.</span>
          </h2>
          <p className="mt-7 max-w-xl text-lead text-ash will-reveal">
            Five things decide what a piece of gold is worth. Four of them can be established with
            an instrument. The fifth is the reference the business works to on the day.
          </p>
        </div>

        <div className="mt-16 grid gap-14 lg:mt-20 lg:grid-cols-12 lg:gap-16">
          {/* --- The subject ----------------------------------------- */}
          <div className="lg:col-span-5">
            <div className="sticky top-28">
              <div
                className="vignette relative aspect-square w-full overflow-hidden border border-gold-antique/16 bg-void"
                aria-hidden="true"
                data-webgl-surface
                data-webgl-label="Inspect"
              >
                <AssayCanvas />
              </div>
              <p className="mt-5 text-xs leading-relaxed text-ash">
                Illustrative only. The piece shown carries a millesimal fineness mark of 916, the
                trade standard figure for 22 carat. It does not represent a specific item or a
                specific valuation.
              </p>
            </div>
          </div>

          {/* --- The factors ----------------------------------------- */}
          <div className="lg:col-span-7">
            <ol className="space-y-px">
              {assayFactors.map((factor, index) => (
                <li
                  key={factor.key}
                  data-assay-factor={index}
                  className="group relative border border-gold-antique/12 bg-char/55 p-8 transition-colors duration-700 data-[active=true]:border-gold-antique/45 data-[active=true]:bg-char lg:p-10"
                >
                  <div className="will-reveal">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <span className="font-sans text-[0.6rem] tracking-[0.24em] text-gold-antique">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h3 className="font-display text-2xl font-semibold text-ivory lg:text-3xl">
                          {factor.label}
                        </h3>
                      </div>
                      <span className="shrink-0 border border-gold-antique/25 px-3 py-1 text-[0.56rem] tracking-[0.2em] text-gold-antique uppercase">
                        {factor.reading}
                      </span>
                    </div>

                    <p className="text-lead text-ivory/70">{factor.body}</p>

                    {/* The active factor is marked by a rule that draws along
                        the left edge — the beam standing on end. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-px origin-top scale-y-0 bg-linear-to-b from-gold-high via-gold-antique to-transparent transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[active=true]:scale-y-100"
                    />
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-10 inset-panel p-8">
              <h3 className="label mb-4">Important</h3>
              <p className="text-sm leading-relaxed text-ivory/72">
                This section explains how gold is assessed in general terms. It is not a valuation
                and does not produce one. A figure for your item can only be established by
                Pureweight, in person, after the item has been weighed and examined.
              </p>
              <div className="mt-5">
                <p className="label-ash mb-2 text-[0.58rem]">Market reference source</p>
                <Fact field={business.priceReferenceSource} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

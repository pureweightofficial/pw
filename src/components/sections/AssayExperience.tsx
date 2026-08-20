"use client";

import { Eyebrow, Fact, Section, WhenVerified } from "@/components/ui/primitives";
import { assayFactors, business } from "@/lib/site";
import { opener } from "@/lib/copy";

const copy = opener("assay", {
  eyebrow: "Chapter 04 — Purity & Weight",
  heading: "Value is not guessed.",
  accent: "It is measured.",
  lead: "Five things decide what a piece of gold is worth. Four of them can be established with an instrument. The fifth is the reference the business works to on the day.",
});

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


export function AssayExperience() {
  return (
    <Section
      id="assay"
      scrollSection="assay"
      material="glass"
      labelledBy="assay-heading"
      className="py-20 lg:py-28"
    >
      <div className="shell">
        {/*
          THE SIGNET RENDER IS GONE, and the caption with it.

          A procedural ring sat here under a caption promising "a millesimal
          fineness mark of 916". It never earned that sentence. Two rounds of
          material work — moving it off the near-mirror roughness maps, tripling
          the normal detail, clamping its yaw so it could not turn edge-on —
          made it better metal and still left it reading, in the owner's words,
          as an unreal item: a glowing torus rather than a piece of jewellery
          you could imagine holding. On the one section whose whole argument is
          "value is measured, not guessed", a picture nobody believes is worse
          than no picture.

          The persistent world behind the page now carries the gold presence
          (see (site)/layout.tsx), so removing this leaves the section lit
          rather than bare — and one fewer full canvas rendering on top of it.

          The heading moved into this column so it is not empty space. That is
          the same short-column/long-column pattern the story and evidence
          sections use.
        */}
        <div className="mt-16 grid gap-14 lg:mt-20 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <Eyebrow className="mb-8 will-reveal">{copy.eyebrow}</Eyebrow>
              <h2
                id="assay-heading"
                className="font-display text-chapter text-ivory will-reveal"
              >
                {copy.heading}
                <br />
                <span className="accent-italic text-gold-high/90">
                  {copy.accent}
                </span>
              </h2>
              <p className="mt-7 text-lead text-ash will-reveal">{copy.lead}</p>
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
                  {/*
                    The active factor is marked by a rule that draws along the
                    left EDGE — the beam standing on end.

                    IT IS A DIRECT CHILD OF THE <li>, and that is the fix, not
                    a tidy-up. It used to live inside the `will-reveal` div,
                    where it looked equally correct: `absolute left-0` against
                    an `li` that is `relative`.

                    But GSAP animates `will-reveal` with a transform, and a
                    transformed element becomes the containing block for its
                    absolutely-positioned descendants. So `left-0` resolved not
                    to the card's border edge but to its CONTENT edge, 32-40px
                    in — landing the rule exactly on the ordinal it sits beside.
                    Two independent design reviews reported the numerals as
                    "clipped by the card border" and the rule as "drawn on top
                    of its own text"; both were seeing this.

                    Nothing about the transform is wrong. The rule simply must
                    not be inside it.
                  */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-px origin-top scale-y-0 bg-linear-to-b from-gold-high via-gold-antique to-transparent transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[active=true]:scale-y-100"
                  />
                  <div className="will-reveal">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <span className="font-sans text-[0.6rem] tracking-[0.24em] text-gold-antique">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h3 className="font-display text-2xl text-ivory lg:text-3xl">
                          {factor.label}
                        </h3>
                      </div>
                      <span className="shrink-0 border border-gold-antique/25 px-3 py-1 text-[0.56rem] tracking-[0.2em] text-gold-antique uppercase">
                        {factor.reading}
                      </span>
                    </div>

                    <p className="text-lead text-ivory/70">{factor.body}</p>

                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-10 inset-panel p-8">
              <h3 className="label mb-4">Important</h3>
              <p className="text-sm leading-relaxed text-ivory/72">
                This section explains how gold is assessed in general terms. It
                is not a valuation and does not produce one. A figure for your
                item can only be established by Pureweight, in person, after the
                item has been weighed and examined.
              </p>
              <WhenVerified field={business.priceReferenceSource}>
                <div className="mt-5">
                  <p className="label-ash mb-2 text-[0.58rem]">
                    Market reference source
                  </p>
                  <Fact field={business.priceReferenceSource} />
                </div>
              </WhenVerified>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

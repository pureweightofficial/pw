"use client";

import { useState } from "react";
import { Eyebrow, Section } from "@/components/ui/primitives";
import { assetPath } from "@/lib/asset";
import { testimonials } from "@/lib/site";

/**
 * TESTIMONIALS
 *
 * Deliberately empty of content.
 *
 * Writing three plausible customer quotes here would take a minute and would be
 * fabricated evidence about a real business — the single most damaging thing
 * this page could carry. So the component ships complete: the typography, the
 * one-at-a-time presentation, the manual controls, the screen-reader
 * announcements — with slots where the approved quotes go.
 *
 * Manual controls only. No auto-rotation anywhere, and specifically not on
 * mobile: a testimonial that moves while it is being read is a testimonial that
 * does not get read.
 */

/*
 * Sourced from src/content/testimonials.json via the keeper panel (imported
 * through @/lib/site above). Adding a real, client-approved quote there is
 * the ONLY way content appears here — the empty state below renders until one
 * exists, and the build gate refuses entries missing a name or context, so an
 * anonymous or half-attributed quote cannot ship.
 */

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const total = testimonials.length;
  const current = testimonials[index];

  const go = (next: number) => setIndex((next + total) % total);

  return (
    <Section
      id="testimonials"
      material="glass"
      labelledBy="testimonials-heading"
      className="py-24 lg:py-36"
    >
      <div className="shell-narrow text-center">
        <Eyebrow align="center" className="mb-8 will-reveal">
          In Their Words
        </Eyebrow>

        <h2 id="testimonials-heading" className="sr-only">
          Customer testimonials
        </h2>

        <div className="min-h-[16rem]" aria-live="polite" aria-atomic="true">
          {current ? (
            <blockquote className="will-reveal">
              {current.photo !== "" ? (
                /* Plain <img>: images.unoptimized makes next/image a no-op,
                   and the photo is a small square the owner's upload pipeline
                   has already resized. Decorative here — the name is adjacent
                   text — so alt stays empty and aria-hidden keeps readers on
                   the words. */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetPath(current.photo)}
                  alt=""
                  aria-hidden="true"
                  className="mx-auto mb-8 h-16 w-16 rounded-full border border-gold-antique/40 object-cover"
                />
              ) : null}
              <p className="font-display text-statement leading-tight text-ivory italic">
                &ldquo;{current.quote}&rdquo;
              </p>
              <footer className="mt-9">
                <p className="text-[0.74rem] font-medium tracking-[0.2em] text-gold-antique uppercase">
                  {current.name}
                </p>
                <p className="mt-2 text-xs tracking-[0.1em] text-ash">
                  {current.context}
                </p>
              </footer>
            </blockquote>
          ) : (
            <div className="will-reveal">
              <p className="mx-auto max-w-2xl font-display text-statement leading-tight text-ash italic">
                &ldquo;&nbsp;&nbsp;&nbsp;&rdquo;
              </p>
              <p className="mx-auto mt-8 inline-flex items-center gap-2 border border-dashed border-gold-antique/35 bg-gold-antique/5 px-4 py-2 text-[0.66rem] tracking-[0.16em] text-gold-antique uppercase">
                <span aria-hidden="true">◇</span>
                Genuine client testimonial required
              </p>
              <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ash">
                No testimonials are shown because none have been supplied and
                approved. This section will display them exactly as written,
                with the customer&apos;s name and context, once the client
                provides them.
              </p>
            </div>
          )}
        </div>

        {/*
          THE COUNTER USED TO LIE.

          `total` was `testimonials.length || SLOT_COUNT`, so with the array
          empty it fell back to 3 and the page rendered "01 / 03" — directly
          above a paragraph saying no testimonials have been supplied. Two
          contradictory statements, and the counter is the one a skimming
          visitor reads. On a site whose entire discipline is that nothing
          unverified may render as fact, a pager asserting three reviews exist
          is the same class of error as inventing the quotes themselves.

          The controls shipped early so the interaction could be "reviewed and
          tested before content lands", but they were `disabled` whenever the
          array was empty — a disabled control demonstrates nothing. So the row
          renders only when there is something to page through, which also
          removes ~100px of dead furniture from the emptiest section on the
          page and retires the `% total` division by zero that was one enabled
          button away from producing NaN.
        */}
        {total > 0 && (
          <div className="mt-12 flex items-center justify-center gap-8">
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="flex h-11 w-11 items-center justify-center border border-gold-antique/28 text-gold-antique transition-colors duration-300 hover:border-gold-rich hover:text-gold-high"
            >
              <span className="sr-only">Previous testimonial</span>
              <span aria-hidden="true">←</span>
            </button>

            <p className="text-[0.62rem] tracking-[0.24em] text-ash uppercase tabular-nums">
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(total).padStart(2, "0")}
            </p>

            <button
              type="button"
              onClick={() => go(index + 1)}
              className="flex h-11 w-11 items-center justify-center border border-gold-antique/28 text-gold-antique transition-colors duration-300 hover:border-gold-rich hover:text-gold-high"
            >
              <span className="sr-only">Next testimonial</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>
    </Section>
  );
}

"use client";

import { CTA } from "@/components/ui/primitives";
import { business, isVerified } from "@/lib/site";

/**
 * THE CONVERSION PATH — and there is now only one.
 *
 * WHY THERE IS NO FORM ANY MORE
 *
 * This business buys over the counter: the customer checks the market price,
 * calls or walks in, the items are examined and weighed in front of them, an
 * offer is made against the live market, and they are paid on the spot. Every one
 * of those steps happens in the shop. A multi-step online valuation form modelled
 * a process that does not exist here — it collected weights and photographs in
 * order to produce a figure that could only ever be provisional, and it added a
 * step between the visitor and the counter rather than removing one.
 *
 * So the form, its schema, its API route and its upload handling are gone —
 * about 1,600 lines. Call, or come in. That is the whole funnel.
 *
 * WHY THIS IS A COMPONENT AND NOT A LINK
 *
 * Because the right call-to-action depends on a fact that is not confirmed yet,
 * and it must not guess.
 *
 *   telephone verified   the primary action is a real `tel:` link. For a walk-in
 *                        trade this is the highest-intent thing on the page, so
 *                        it takes the primary slot and the address moves to
 *                        secondary.
 *   telephone pending    a `tel:` link cannot be fabricated and a dead button is
 *                        worse than none, so the primary action becomes "visit",
 *                        pointing at the page that carries the address, the hours
 *                        and their placeholder markers.
 *
 * Both states are complete and neither invents anything. When the number lands in
 * `business.telephone`, every call site upgrades at once with no further edits.
 */

export type VisitCtaProps = {
  /** Extra classes for the wrapper — usually alignment. */
  className?: string;
  /**
   * The page's single loudest ask. Struck-gold face instead of the outlined
   * one, for the closing section only — see `.btn-crescendo`. Passing this a
   * second time on the same page costs the first one its meaning.
   */
  crescendo?: boolean;
  /**
   * Suppresses the secondary action. Used where the surrounding block already
   * carries the address, so a "find the shop" link would point at itself.
   */
  primaryOnly?: boolean;
};

export function VisitCta({
  className = "",
  primaryOnly = false,
  crescendo = false,
}: VisitCtaProps) {
  const phone = business.telephone;
  const callable = isVerified(phone);

  return (
    <div
      className={`flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-7 ${className}`}
    >
      {callable ? (
        <CTA
          href={`tel:${String(phone.value).replace(/[^+\d]/g, "")}`}
          className={`w-full justify-center sm:w-auto ${
            crescendo ? "btn-crescendo" : ""
          }`}
        >
          Call {phone.value}
        </CTA>
      ) : (
        <CTA
          href="/contact"
          className={`w-full justify-center sm:w-auto ${
            crescendo ? "btn-crescendo" : ""
          }`}
        >
          Visit Our Shop
        </CTA>
      )}

      {primaryOnly ? null : (
        <CTA href="/contact" variant="ghost" magnetic={false}>
          {callable ? "Find the shop" : "Opening hours & directions"}
          {/* ml-1 is not decoration. The label carries tracking-[0.24em], which
              adds a trailing letter-space the eye does not read as a space, so
              an arrow set immediately after it appears welded to the final
              glyph. */}
          <span aria-hidden="true" className="ml-1 text-gold-antique">
            →
          </span>
        </CTA>
      )}
    </div>
  );
}

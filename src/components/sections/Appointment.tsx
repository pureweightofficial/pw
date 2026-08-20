"use client";

import { Eyebrow, Fact, Section, WhenVerified } from "@/components/ui/primitives";
import { VisitCta } from "@/components/ui/VisitCta";
import { business } from "@/lib/site";
import { AmbientGlow } from "@/components/ui/AmbientGlow";

/**
 * VISIT THE SHOP
 *
 * This was a form panel. It is now the counter.
 *
 * WHY THE FORM WENT
 *
 * The business buys over the counter: items are examined and weighed in front of
 * the customer, an offer is made against the live market, and they are paid there
 * and then. A multi-step online valuation form modelled a process that does not
 * exist here. Worse, it added a step BETWEEN the visitor and the counter while
 * appearing to remove one — someone who fills in weights and uploads photographs
 * reasonably expects a figure back, and no honest figure can be produced without
 * the item in hand. The old copy had to spend three bullet points explaining that
 * the form would not do the thing it looked like it did.
 *
 * Removing it removed that problem rather than mitigating it.
 *
 * SINGLE SHOP, DELIBERATELY
 *
 * Every phrase here says "our shop", never "your nearest store" and never
 * "branches". The client confirmed one premises. Pluralising it would be an
 * invented fact of exactly the kind this project keeps auditing for, and it is an
 * easy one to let slip in while writing naturally about a retail business.
 *
 * WHAT IS ASSERTED, AND ON WHOSE AUTHORITY
 *
 * The client confirmed the trade: buying gold and silver jewellery, coins and
 * bullion, paid on acceptance. That is their statement about their own business,
 * so it can be written plainly.
 *
 * The ADDRESS is now a verified fact (supplied 2026-07-31) and renders as a
 * live directions link. The hours, the phone number and how settlement is made
 * are still unconfirmed and, under hide-until-verified, render as nothing at
 * all — their whole row is withheld by <WhenVerified> rather than shown as a
 * gap (this line described the retired placeholder chips)
 * rather than plausible guesses.
 */

const BEFORE_YOU_COME = [
  {
    title: "Bring the pieces, not the paperwork",
    body: "Jewellery worn or broken, odd earrings, chains, coins, bars. Hallmarks help but are not needed — we establish purity ourselves.",
  },
  {
    title: "Nothing is cleaned, cut or altered",
    body: "Your items are examined and weighed as they are, in front of you, and handed straight back if you would rather keep them.",
  },
  {
    title: "You see the scale and the working",
    body: "The weight, the purity we have established, and how the offer relates to the market price of the day are all shown to you before you decide.",
  },
  {
    title: "There is no obligation to sell",
    body: "An examination and a figure cost nothing. Walking out with your gold is a perfectly normal outcome.",
  },
];

export function Appointment() {
  return (
    <Section
      id="appointment"
      material="bronze"
      labelledBy="appointment-heading"
      className="py-20 lg:py-28"
    >
      <AmbientGlow intensity="soft" placement="right" />
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          {/* --- Framing ------------------------------------------------ */}
          <div className="lg:col-span-6">
            <Eyebrow className="mb-8 will-reveal">
              Chapter 06 — Come and See Us
            </Eyebrow>

            <h2
              id="appointment-heading"
              className="font-display text-chapter text-ivory will-reveal"
            >
              Bring it in, and
              <span className="accent-italic text-gold-high/90">
                {" "}
                watch it weighed.
              </span>
            </h2>

            <p className="mt-8 max-w-md text-lead text-ivory/72 will-reveal">
              There is no form to fill in and no figure to wait for. Come to the
              shop, and we will examine and weigh your items with you at the
              counter.
            </p>

            <ul className="mt-10 space-y-5 will-reveal">
              {BEFORE_YOU_COME.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-2.5 h-px w-6 shrink-0 bg-gold-antique/60"
                  />
                  <div>
                    <p className="text-sm font-medium text-ivory/88">
                      {item.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ash">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* --- The counter card --------------------------------------- */}
          <div className="lg:col-span-6">
            <div className="border border-bronze/40 bg-void/50 p-8 sm:p-10 will-reveal lg:sticky lg:top-32">
              <p className="label label-rule text-gold-antique">Our Shop</p>

              <dl className="mt-8 space-y-7">
                {/* Each row is a VERIFIED business fact; unverified rows are
                    absent, label and all — hide-until-verified. Nothing here
                    is ever a plausible-sounding stand-in. */}
                <WhenVerified field={business.address}>
                  <div>
                    <dt className="label-ash mb-2 text-[0.58rem]">Address</dt>
                    <dd className="text-lead leading-relaxed text-ivory/85">
                      <Fact field={business.address} link="map" />
                    </dd>
                  </div>
                </WhenVerified>

                <WhenVerified field={business.openingHours}>
                  <div>
                    <dt className="label-ash mb-2 text-[0.58rem]">
                      Opening hours
                    </dt>
                    <dd className="text-sm leading-relaxed text-ivory/72">
                      <Fact field={business.openingHours} />
                    </dd>
                  </div>
                </WhenVerified>

                <WhenVerified field={business.telephone}>
                  <div>
                    <dt className="label-ash mb-2 text-[0.58rem]">Telephone</dt>
                    <dd className="text-sm leading-relaxed text-ivory/72">
                      <Fact field={business.telephone} link="tel" />
                    </dd>
                  </div>
                </WhenVerified>

                <WhenVerified field={business.settlementMethods}>
                  <div>
                    <dt className="label-ash mb-2 text-[0.58rem]">
                      How you are paid
                    </dt>
                    <dd className="text-sm leading-relaxed text-ivory/72">
                      <Fact field={business.settlementMethods} />
                    </dd>
                  </div>
                </WhenVerified>
              </dl>

              <div className="mt-10 border-t border-gold-antique/16 pt-8">
                <VisitCta />
              </div>

              <p className="mt-8 text-[0.78rem] leading-relaxed text-ash">
                Prices move through the trading day, so any figure we discuss is
                against the market at the moment you are standing at the
                counter.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

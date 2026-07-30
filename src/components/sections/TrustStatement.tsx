import { BeamDivider, Eyebrow, Section } from '@/components/ui/primitives';
import { trustStrip } from '@/lib/site';

/**
 * IMMEDIATE TRUST
 *
 * Placed directly after the hero, before any selling. Someone about to hand
 * over inherited gold needs to know how they will be treated before they need
 * to know what is on the menu.
 *
 * The strip carries characteristics of the *service* — how appointments work,
 * how items are weighed, how information is handled. Not one item claims a
 * credential. Awards, licences, certifications, insurance and customer counts
 * all live behind the verification guard in `site.ts` and appear further down
 * the page only once the client supplies them.
 */

export function TrustStatement() {
  return (
    <Section id="trust" material="steel" labelledBy="trust-heading" className="py-24 lg:py-36">
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Eyebrow className="mb-8 will-reveal">Chapter 01 — True Value</Eyebrow>

            <h2
              id="trust-heading"
              className="font-display text-statement font-semibold text-ivory will-reveal"
            >
              Every gram carries value.
              <br />
              <span className="accent-accent-italic text-gold-high/90">Every exchange deserves clarity.</span>
            </h2>
          </div>

          <div className="lg:col-span-5 lg:pt-20">
            <p className="text-lead text-ivory/70 will-reveal">
              Pureweight approaches gold valuation through accurate measurement, transparent
              communication and professional handling.
            </p>
            <p className="mt-6 text-lead text-ash will-reveal">
              You are shown the weight. You are shown the fineness. You are shown how those two
              figures produce the number in front of you — before you are asked to decide anything
              at all.
            </p>
          </div>
        </div>

        <BeamDivider className="mt-20 mb-14 will-reveal" />

        <ul className="grid grid-cols-1 gap-px overflow-hidden border border-gold-antique/14 bg-gold-antique/14 sm:grid-cols-2 lg:grid-cols-4">
          {trustStrip.map((item, index) => (
            <li
              key={item}
              className="group relative flex items-center gap-4 bg-char px-7 py-8 will-reveal"
            >
              <span className="font-sans text-[0.6rem] tracking-[0.22em] text-gold-antique">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-[0.78rem] font-medium tracking-[0.14em] text-ivory/85 uppercase">
                {item}
              </span>
              {/* A gold rule draws along the base on hover — the only motion
                  this strip has, and it fires one element at a time. */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-linear-to-r from-gold-antique to-transparent transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
              />
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs leading-relaxed text-ash">
          These describe how the service is conducted. Registrations, certifications, memberships
          and insurance are listed separately under Verified Trust Evidence, and only once
          confirmed.
        </p>
      </div>
    </Section>
  );
}

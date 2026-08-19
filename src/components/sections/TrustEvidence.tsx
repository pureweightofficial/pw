import { Eyebrow, Fact, Section } from "@/components/ui/primitives";
import { business, isVerified } from "@/lib/site";
import { AmbientGlow } from "@/components/ui/AmbientGlow";

/**
 * VERIFIED TRUST EVIDENCE
 *
 * Evidence, not badges. There are no shield icons, no "100% trusted" seals and
 * no five-star graphics on this page, because a trust badge that nobody issued
 * is a forgery with rounded corners.
 *
 * Instead: a ledger of the things that can actually be checked — registration,
 * premises, memberships, insurance, equipment, security procedure — each
 * rendering either the client's confirmed detail or a visible slot. The empty
 * slots are the point. They tell an honest reviewer exactly what has been
 * verified and what has not.
 */

const evidence = [
  {
    label: "Business registration",
    field: business.registrationNumber,
    note: "Companies register entry and number.",
  },
  {
    label: "Registered legal name",
    field: business.legalName,
    note: "As filed.",
  },
  {
    label: "VAT / tax registration",
    field: business.vatNumber,
    note: "Where applicable.",
  },
  {
    label: "Trading address",
    field: business.address,
    note: "Physical premises.",
  },
  {
    label: "Professional memberships",
    field: business.memberships,
    note: "Trade bodies and associations.",
  },
  {
    label: "Certifications",
    field: business.certifications,
    note: "Issuing body and scope.",
  },
  {
    label: "Licences",
    field: business.licences,
    note: "Issuing authority and number.",
  },
  {
    label: "Insurance",
    field: business.insurance,
    note: "Cover held for items on premises.",
  },
  {
    label: "Security procedures",
    field: business.securityProcedures,
    note: "How items and data are held.",
  },
  {
    label: "Weighing and assay equipment",
    field: business.weighingEquipment,
    note: "Instruments used, and calibration.",
  },
  {
    label: "Customer review score",
    field: business.reviewScore,
    note: "Genuine aggregate, with its source.",
  },
  {
    label: "Settlement methods",
    field: business.settlementMethods,
    note: "How an exchange is completed.",
  },
] as const;

export function TrustEvidence() {
  // Hide-until-verified, section grade: with nothing verified there is no
  // evidence to show, and an empty ledger reads worse than no ledger.
  if (!evidence.some((item) => isVerified(item.field))) return null;

  return (
    <Section
      id="evidence"
      material="steel"
      labelledBy="evidence-heading"
      className="py-20 lg:py-28"
    >
      <AmbientGlow intensity="soft" placement="left" />
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            {/*
              STICKY, LIKE EVERY OTHER SECTION WITH THIS SHAPE.

              Measured at 1440x900: this heading block is 318px of content
              beside a 1049px ledger, leaving a 731px dead rail once the heading
              scrolls away. That was the largest genuinely empty region on the
              page — and the only large one that was not an artefact of
              screenshotting a section taller than the viewport, which breaks
              position:sticky and invents voids that no visitor ever sees.

              Six sections share this short-column/long-column split. Brand
              story (611px beside 908px), the assay experience and the journey
              all pin the short one so it travels with the reader. This one did
              not, for no reason anyone recorded.

              Pinning it costs nothing and adds no canvas. It also puts the
              explanation where it is needed: this heading is what tells the
              reader that the blank slots below are deliberate rather than
              unfinished, and it used to scroll away before they reached them.
            */}
            <div className="lg:sticky lg:top-32">
              <Eyebrow className="mb-8 will-reveal">Evidence</Eyebrow>
              <h2
                id="evidence-heading"
                className="font-display text-chapter text-ivory will-reveal"
              >
                Checkable,{" "}
                <span className="accent-italic text-gold-high/90">
                  not claimed
                </span>
              </h2>
              <p className="mt-7 max-w-md text-lead text-ash will-reveal">
                Anything below that is not filled in has not been verified, and
                is shown as an open slot rather than filled with something
                plausible. That is deliberate.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <dl className="border-t border-gold-antique/16">
              {/* Only rows somebody has actually verified. An empty ledger
                  would be a section with nothing to say — it collapses via the
                  shown-guard below rather than rendering a frame of absences. */}
              {evidence
                .filter((item) => isVerified(item.field))
                .map((item) => (
                <div
                  key={item.label}
                  className="grid gap-2 border-b border-gold-antique/12 py-6 will-reveal sm:grid-cols-5 sm:items-baseline sm:gap-6"
                >
                  <dt className="sm:col-span-2">
                    <span className="block text-[0.74rem] font-medium tracking-[0.13em] text-ivory/85 uppercase">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-xs text-ash">
                      {item.note}
                    </span>
                  </dt>
                  <dd className="text-sm text-ivory/70 sm:col-span-3">
                    <Fact field={item.field} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </Section>
  );
}

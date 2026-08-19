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
 * premises, memberships, insurance, equipment, security procedure — listing
 * ONLY what the business has confirmed.
 *
 * It used to render an unverified entry as a visible empty slot, and both this
 * comment and the section's own lead copy said so in as many words. Phase 4
 * retired the slots from the public site: unverified facts are now absent
 * rather than advertised. The copy did not follow, so the section spent a
 * release telling readers to look at open slots that were no longer there —
 * a page contradicting itself in its own trust section, which is the worst
 * possible section for that. Fixed here.
 *
 * The Keeper still holds the full list, still shows the owner every gap, and
 * still refuses invented values. The ledger of what is missing belongs there;
 * this page carries only the ledger of what is true.
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
  const verified = evidence.filter((item) => isVerified(item.field));
  if (verified.length === 0) return null;

  return (
    <Section
      id="evidence"
      material="steel"
      labelledBy="evidence-heading"
      className="py-20 lg:py-28"
    >
      <AmbientGlow intensity="soft" placement="left" />
      <div className="shell">
        {/*
          A SHORT LEDGER DOES NOT GET A TWO-COLUMN SPREAD.

          The split puts a ~320px heading block beside the list. When the list
          is one row tall, the grid row is still the height of the heading, so
          the ledger column carried a single entry above ~350px of nothing —
          which two review passes read, reasonably, as "promises evidence and
          shows one row" and "one stranded row above an empty column".

          Below three verified entries the section stacks instead: heading,
          then the ledger directly beneath it at reading width. Same content,
          no void, and it grows into the two-column form on its own the moment
          the owner verifies a third fact in the Keeper.
        */}
        <div
          className={
            verified.length >= 3
              ? "grid gap-10 lg:grid-cols-12 lg:gap-16"
              : "max-w-3xl"
          }
        >
          <div className={verified.length >= 3 ? "lg:col-span-5" : ""}>
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
            <div className={verified.length >= 3 ? "lg:sticky lg:top-32" : ""}>
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
                Every entry below has been confirmed by the business and can be
                checked independently. Nothing is listed here on the strength
                of a plausible guess, and nothing is listed until it is
                verified — so this list grows rather than starts complete.
              </p>
            </div>
          </div>

          {/*
            The ledger column narrows when the ledger is short.

            With a single verified entry, a 7-column table laid one label and
            one value across 1,049px and left roughly 700px of nothing under
            them — a design review read the whole section as "promises evidence
            and shows one row", and the emptiness was doing most of that work.
            Two or fewer entries get a column sized to them instead, so a short
            ledger reads as a short ledger rather than as a broken table.
          */}
          <div className={verified.length >= 3 ? "lg:col-span-7" : "mt-12"}>
            <dl className="border-t border-gold-antique/16">
              {/* Only rows somebody has actually verified. An empty ledger
                  would be a section with nothing to say — it collapses via the
                  shown-guard below rather than rendering a frame of absences. */}
              {verified.map((item) => (
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

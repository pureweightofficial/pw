import { Eyebrow, Fact, Section } from '@/components/ui/primitives';
import { business } from '@/lib/site';

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
    label: 'Business registration',
    field: business.registrationNumber,
    note: 'Companies register entry and number.',
  },
  { label: 'Registered legal name', field: business.legalName, note: 'As filed.' },
  { label: 'VAT / tax registration', field: business.vatNumber, note: 'Where applicable.' },
  { label: 'Trading address', field: business.address, note: 'Physical premises.' },
  {
    label: 'Professional memberships',
    field: business.memberships,
    note: 'Trade bodies and associations.',
  },
  { label: 'Certifications', field: business.certifications, note: 'Issuing body and scope.' },
  { label: 'Licences', field: business.licences, note: 'Issuing authority and number.' },
  { label: 'Insurance', field: business.insurance, note: 'Cover held for items on premises.' },
  {
    label: 'Security procedures',
    field: business.securityProcedures,
    note: 'How items and data are held.',
  },
  {
    label: 'Weighing and assay equipment',
    field: business.weighingEquipment,
    note: 'Instruments used, and calibration.',
  },
  {
    label: 'Customer review score',
    field: business.reviewScore,
    note: 'Genuine aggregate, with its source.',
  },
  {
    label: 'Settlement methods',
    field: business.settlementMethods,
    note: 'How an exchange is completed.',
  },
] as const;

export function TrustEvidence() {
  return (
    <Section id="evidence" material="steel" labelledBy="evidence-heading" className="py-24 lg:py-36">
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Eyebrow className="mb-8 will-reveal">Evidence</Eyebrow>
            <h2
              id="evidence-heading"
              className="font-display text-chapter font-semibold text-ivory will-reveal"
            >
              Checkable, <span className="accent-accent-italic text-gold-high/90">not claimed</span>
            </h2>
            <p className="mt-7 max-w-md text-lead text-ash will-reveal">
              Anything below that is not filled in has not been verified, and is shown as an open
              slot rather than filled with something plausible. That is deliberate.
            </p>
          </div>

          <div className="lg:col-span-7">
            <dl className="border-t border-gold-antique/16">
              {evidence.map((item) => (
                <div
                  key={item.label}
                  className="grid gap-2 border-b border-gold-antique/12 py-6 will-reveal sm:grid-cols-5 sm:items-baseline sm:gap-6"
                >
                  <dt className="sm:col-span-2">
                    <span className="block text-[0.74rem] font-medium tracking-[0.13em] text-ivory/85 uppercase">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-xs text-ash">{item.note}</span>
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

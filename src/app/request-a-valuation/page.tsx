import type { Metadata } from 'next';
import { ValuationForm } from '@/components/form/ValuationForm';
import { Eyebrow, Fact, Section } from '@/components/ui/primitives';
import { business } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Request a Private Valuation',
  description:
    'Begin a private, transparent conversation about your gold. Share what you know — weight, hallmark and photographs are all optional — and the Pureweight team will guide you through the next step.',
  alternates: { canonical: '/request-a-valuation' },
  openGraph: {
    title: 'Request a Private Valuation — Pureweight Gold Exchange',
    description: 'A private, transparent conversation about your gold. No obligation, no figure implied.',
  },
};

/**
 * REQUEST A VALUATION
 *
 * The dedicated destination for the navigation CTA. The same form as the
 * homepage section, given a page of its own so it can be linked, bookmarked and
 * used as a campaign landing page — with the distractions of a full homepage
 * removed and a single H1 stating exactly what this is.
 */
export default function RequestValuationPage() {
  return (
    <Section material="steel" labelledBy="request-heading" className="pb-24 pt-36 lg:pb-36 lg:pt-44">
      <div className="shell">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow className="mb-8">Private Valuation</Eyebrow>
          <h1 id="request-heading" className="font-display text-chapter font-normal text-ivory">
            Know the true value
            <br />
            <span className="italic text-gold-high/90">of what you hold.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lead text-ivory/72">
            Six short steps. Nothing is required that you may not know, and nothing you send here
            produces a figure — a valuation is established in person, once the item has been weighed
            and examined.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-3xl">
          <ValuationForm />
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <div className="grid gap-8 border-t border-gold-antique/16 pt-10 sm:grid-cols-3">
            <div>
              <p className="label-ash mb-2.5 text-[0.58rem]">Telephone</p>
              <div className="text-sm text-ivory/72">
                <Fact field={business.telephone} />
              </div>
            </div>
            <div>
              <p className="label-ash mb-2.5 text-[0.58rem]">Opening hours</p>
              <div className="text-sm text-ivory/72">
                <Fact field={business.openingHours} />
              </div>
            </div>
            <div>
              <p className="label-ash mb-2.5 text-[0.58rem]">Appointment process</p>
              <div className="text-sm text-ivory/72">
                <Fact field={business.appointmentProcess} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

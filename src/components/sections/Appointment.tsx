import { ValuationForm } from '@/components/form/ValuationForm';
import { Eyebrow, Fact, Section } from '@/components/ui/primitives';
import { business } from '@/lib/site';

/**
 * PRIVATE APPOINTMENT
 *
 * Positioned as a consultation, not a contact form. The copy on the left sets
 * the expectation before the first field is seen: this begins a conversation,
 * it does not produce a number.
 *
 * That framing is doing compliance work as well as brand work. A visitor who
 * believes a form will value their gold will be disappointed and will feel
 * misled; a visitor told plainly that a person will look at it arrives with the
 * right expectation and is far more likely to keep the appointment.
 */

export function Appointment() {
  return (
    <Section
      id="appointment"
      material="bronze"
      labelledBy="appointment-heading"
      className="py-24 lg:py-36"
    >
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          {/* --- Framing ------------------------------------------------ */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <Eyebrow className="mb-8 will-reveal">Chapter 06 — Begin Your Exchange</Eyebrow>

              <h2
                id="appointment-heading"
                className="font-display text-chapter font-normal text-ivory will-reveal"
              >
                A private conversation
                <span className="accent-italic text-gold-high/90"> about true value.</span>
              </h2>

              <p className="mt-8 max-w-md text-lead text-ivory/72 will-reveal">
                Share a few details about your gold and a member of the Pureweight team can guide
                you through the confirmed next step.
              </p>

              <ul className="mt-10 space-y-5 will-reveal">
                {[
                  {
                    title: 'It is an enquiry, not a valuation',
                    body: 'No figure is calculated from this form, and none is implied by it.',
                  },
                  {
                    title: 'Nothing is required that you may not know',
                    body: 'Weight, carat and photographs are all optional. Establishing them is our work.',
                  },
                  {
                    title: 'Your details go no further',
                    body: 'Used to respond to this enquiry and nothing else.',
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <span aria-hidden="true" className="mt-2.5 h-px w-6 shrink-0 bg-gold-antique/60" />
                    <div>
                      <p className="text-sm font-medium text-ivory/88">{item.title}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-ash">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-12 border-t border-gold-antique/16 pt-8 will-reveal">
                <p className="label-ash mb-3 text-[0.58rem]">Prefer to speak to someone</p>
                <div className="space-y-2 text-sm text-ivory/72">
                  <Fact field={business.telephone} link="tel" />
                  <Fact field={business.openingHours} />
                </div>
              </div>
            </div>
          </div>

          {/* --- The form ----------------------------------------------- */}
          <div className="lg:col-span-7">
            <ValuationForm />
          </div>
        </div>
      </div>
    </Section>
  );
}

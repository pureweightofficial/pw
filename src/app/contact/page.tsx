import type { Metadata } from 'next';
import Link from 'next/link';
import { BeamDivider, Eyebrow, Fact, Section } from '@/components/ui/primitives';
import { brand, business, canonicalPath, ogFor, type Verifiable } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Pureweight Gold Exchange to arrange a private valuation or to ask a question about gold weight, purity and evaluation.',
  alternates: { canonical: canonicalPath('/contact') },
  // Complete block per page: Next replaces openGraph wholesale rather than
  // deep-merging, so a partial one silently drops og:image/site_name/type and
  // an absent one inherits the HOMEPAGE og:url on every subpage.
  openGraph: ogFor({
    title: 'Contact — Pureweight Gold Exchange',
    description:
      'Contact Pureweight Gold Exchange to arrange a private valuation or to ask a question about gold weight, purity and evaluation.',
    path: '/contact',
  }),
};

/**
 * CONTACT
 *
 * Every detail on this page is a verified field or a visible slot. Contact
 * pages are where placeholder addresses and invented phone numbers most often
 * survive to launch — and a wrong number on a gold business's contact page
 * sends people carrying valuables to the wrong door.
 */
export default function ContactPage() {
  // `link` is declarative ('tel'/'mailto') because Fact sits inside the client
  // boundary and cannot receive functions from this server component — passing
  // a render function here was a build-breaking serialization error.
  const details: {
    label: string;
    // All six rows are string facts. Indexing the whole business object would
    // union in Verifiable<string[]> (social) and break Fact's inference.
    field: Verifiable<string>;
    link?: 'tel' | 'mailto';
  }[] = [
    { label: 'Telephone', field: business.telephone, link: 'tel' },
    { label: 'Email', field: business.email, link: 'mailto' },
    { label: 'Address', field: business.address },
    { label: 'Opening hours', field: business.openingHours },
    { label: 'Service area', field: business.serviceArea },
    { label: 'Appointment process', field: business.appointmentProcess },
  ];

  return (
    <Section material="stone" labelledBy="contact-heading" className="pb-24 pt-36 lg:pb-36 lg:pt-44">
      <div className="shell">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <Eyebrow className="mb-8">Contact</Eyebrow>
            <h1 id="contact-heading" className="font-display text-chapter font-normal text-ivory">
              Speak with <span className="accent-italic text-gold-high/90">Pureweight</span>
            </h1>
            <p className="mt-8 max-w-md text-lead text-ivory/72">
              For a valuation, bring the item to a private appointment. For anything else — a
              question about a hallmark, what to bring, or how the process works — get in touch and
              we will answer plainly.
            </p>

            <BeamDivider className="mt-12 max-w-xs" />

            <Link href="/contact" className="btn-primary mt-12">
              <span className="relative z-10">Visit Our Shop</span>
            </Link>
          </div>

          <div className="lg:col-span-7">
            <dl className="border-t border-gold-antique/16">
              {details.map((item) => (
                <div
                  key={item.label}
                  className="grid gap-2 border-b border-gold-antique/12 py-7 sm:grid-cols-3 sm:items-baseline sm:gap-6"
                >
                  <dt className="text-[0.66rem] tracking-[0.18em] text-ash uppercase">
                    {item.label}
                  </dt>
                  <dd className="text-sm text-ivory/78 sm:col-span-2">
                    <Fact field={item.field} link={item.link} />
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-8 text-xs leading-relaxed text-ash">
              {brand.shortName} does not provide valuations by telephone, email or through this
              website. Any figure is established in person, after the item has been weighed and
              examined.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

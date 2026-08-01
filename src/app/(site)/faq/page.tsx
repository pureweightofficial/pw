import type { Metadata } from 'next';
import Link from 'next/link';
import { BeamDivider, Eyebrow, Placeholder, Section } from '@/components/ui/primitives';
import { canonicalPath, ogFor } from '@/lib/site';
import faqContent from '@/content/faq.json';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Straight answers about how gold is weighed and valued — carat and fineness, troy ounces, hallmarks, what to bring to a valuation, and what affects what a piece is worth.',
  alternates: { canonical: canonicalPath('/faq') },
  // Complete block per page: Next replaces openGraph wholesale rather than
  // deep-merging, so a partial one silently drops og:image/site_name/type and
  // an absent one inherits the HOMEPAGE og:url on every subpage.
  openGraph: ogFor({
    title: 'Frequently Asked Questions — Pureweight Gold Exchange',
    description:
      'Straight answers about how gold is weighed and valued — carat and fineness, troy ounces, hallmarks, what to bring to a valuation, and what affects what a piece is worth.',
    path: '/faq',
  }),
};

/**
 * FAQ
 *
 * Split into two kinds of question, because they carry completely different
 * risk:
 *
 *  GENERAL — carat as a fraction of 24, the troy ounce at 31.1035g, why solder
 *  and stones reduce recoverable metal. These are trade-standard, independently
 *  checkable facts. They are safe to publish, genuinely useful to someone about
 *  to sell for the first time, and they are what this business should rank for.
 *
 *  BUSINESS-SPECIFIC — fees, turnaround, identification, payment method. Every
 *  one of these is a promise on the client's behalf. They render as marked
 *  slots.
 *
 * `FAQPage` structured data is built from the general answers ONLY. Marking up
 * a placeholder as an answer would publish "[INSERT CONFIRMED PAYMENT METHOD]"
 * as this business's stated policy in a search result.
 */

type Answered = { question: string; answer: string };
type Pending = { question: string; placeholder: string; note: string };

/**
 * OWNER-EDITABLE, via the Keeper's FAQ tab. The general questions moved to
 * src/content/faq.json so the owner can edit and extend them without a
 * developer — they are trade-standard knowledge, safe in the owner's hands,
 * and exactly what an answer engine should be citing this business for.
 *
 * The business-specific list below deliberately did NOT move. Every one of
 * those is a promise (fees, timing, insurance, identification), and promises
 * on this site are only ever unlocked by verifying the underlying business
 * fact — not by typing an answer into a box.
 */
const general: Answered[] = faqContent.general;

const businessSpecific: Pending[] = [
  {
    question: 'What identification do I need to bring?',
    placeholder: '[INSERT CONFIRMED IDENTIFICATION REQUIREMENTS]',
    note: 'Dealers in precious metals are commonly required to record customer identity. The exact documents accepted must be confirmed by the business.',
  },
  {
    question: 'How is payment made, and when?',
    placeholder: '[INSERT CONFIRMED SETTLEMENT / PAYMENT METHODS]',
    note: 'Must state the actual methods offered and their timing. No same-day or instant-payment claim is made anywhere on this site until confirmed.',
  },
  {
    question: 'Is there a charge for a valuation?',
    placeholder: '[INSERT CONFIRMED VALUATION FEE POLICY]',
    note: 'Must state plainly whether an assessment is free or chargeable, and under what conditions.',
  },
  {
    question: 'How long does an assessment take?',
    placeholder: '[INSERT CONFIRMED ASSESSMENT TIMEFRAME]',
    note: 'No turnaround time is stated anywhere on this site until the business confirms one.',
  },
  {
    question: 'Are my items insured while they are with you?',
    placeholder: '[INSERT VERIFIED INSURANCE DETAILS]',
    note: 'A cover claim must never be made without the policy behind it.',
  },
  {
    question: 'Do I have to sell if I do not like the figure?',
    placeholder: '[INSERT CONFIRMED NO-OBLIGATION POLICY]',
    note: 'Almost certainly no obligation, but this is the business’s statement to make, not ours.',
  },
];

export default function FaqPage() {
  // Structured data from the answered questions only.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: general.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <Section material="steel" labelledBy="faq-heading" className="pb-24 pt-36 lg:pb-36 lg:pt-44">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="shell">
        <div className="max-w-3xl">
          <Eyebrow className="mb-8">Frequently Asked Questions</Eyebrow>
          <h1 id="faq-heading" className="font-display text-chapter font-normal text-ivory">
            Straight answers,
            <span className="accent-italic text-gold-high/90"> before you decide anything</span>
          </h1>
          <p className="mt-8 max-w-xl text-lead text-ivory/72">
            Most people sell gold once or twice in a lifetime. These are the questions that come up
            most often, answered plainly.
          </p>
        </div>

        {/* --- Answered ------------------------------------------------- */}
        <div className="mt-20 max-w-3xl">
          <h2 className="label mb-10">Understanding gold</h2>

          <dl className="border-t border-gold-antique/16">
            {general.map((item, index) => (
              <div key={item.question} className="border-b border-gold-antique/12 py-9">
                <dt className="flex items-baseline gap-5">
                  <span className="font-sans text-[0.6rem] tracking-[0.22em] text-gold-antique">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="font-display text-2xl font-normal leading-snug text-ivory lg:text-3xl">
                    {item.question}
                  </span>
                </dt>
                <dd className="mt-5 pl-[3.1rem] text-lead text-ivory/70">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>

        <BeamDivider className="my-20 max-w-3xl" />

        {/* --- Pending -------------------------------------------------- */}
        <div className="max-w-3xl">
          <h2 className="label mb-5">Working with Pureweight</h2>
          <p className="mb-10 max-w-xl text-sm leading-relaxed text-ash">
            These answers describe how this specific business operates, so they are left open
            rather than assumed. Each is a commitment only Pureweight can make.
          </p>

          <dl className="border-t border-gold-antique/16">
            {businessSpecific.map((item) => (
              <div key={item.question} className="border-b border-gold-antique/12 py-8">
                <dt className="font-display text-xl font-normal text-ivory lg:text-2xl">
                  {item.question}
                </dt>
                <dd className="mt-4">
                  <Placeholder label={item.placeholder} />
                  <p className="mt-2 text-xs leading-relaxed text-ash">{item.note}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-16 flex flex-wrap gap-4">
          <Link href="/contact" className="btn-primary">
            <span className="relative z-10">Visit Our Shop</span>
          </Link>
          <Link href="/contact" className="btn-ghost">
            Ask Something Else
          </Link>
        </div>
      </div>
    </Section>
  );
}

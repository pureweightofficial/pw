import type { Metadata } from 'next';
import Link from 'next/link';
import { Eyebrow, Section } from '@/components/ui/primitives';
import { pageMetadata } from '@/lib/seo';
import faqContent from '@/content/faq.json';

export const metadata: Metadata = pageMetadata('faq', '/faq', {
  title: 'Frequently Asked Questions',
  description:
    'Straight answers about how gold is weighed and valued — carat and fineness, troy ounces, hallmarks, what to bring to a valuation, and what affects what a piece is worth.',
});

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
          <h1 id="faq-heading" className="font-display text-chapter text-ivory">
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
                  <span className="font-display text-2xl leading-snug text-ivory lg:text-3xl">
                    {item.question}
                  </span>
                </dt>
                <dd className="mt-5 pl-[3.1rem] text-lead text-ivory/70">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/*
          The "Working with Pureweight" block lived here: business-specific
          questions, each "answered" by a visible placeholder chip. Under
          hide-until-verified, a public list of admittedly-unanswered questions
          is exactly the advertising-of-gaps the policy removes — so the block
          waits in the Keeper's business fields until real answers exist,
          rather than on the page as a list of blanks.
        */}

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

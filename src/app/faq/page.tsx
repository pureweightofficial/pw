import type { Metadata } from 'next';
import Link from 'next/link';
import { BeamDivider, Eyebrow, Placeholder, Section } from '@/components/ui/primitives';
import { brand } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Straight answers about how gold is weighed and valued — carat and fineness, troy ounces, hallmarks, what to bring to a valuation, and what affects what a piece is worth.',
  alternates: { canonical: '/faq' },
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

const general: Answered[] = [
  {
    question: 'What does carat actually mean?',
    answer:
      'Carat describes how much of an alloy is gold, expressed in twenty-fourths. 24 carat is pure gold. 22ct is 22 parts in 24, usually marked 916 parts per thousand; 18ct is 750; 14ct is 585; 9ct is 375. Everything that is not gold is alloy — typically copper, silver or zinc — and it carries no precious-metal value. This is why a heavy 9ct chain can be worth less than a much lighter 22ct one.',
  },
  {
    question: 'Why is my gold weighed in troy ounces?',
    answer:
      'Precious metals use troy weight, not the everyday avoirdupois ounce. One troy ounce is 31.1035 grams, against 28.3495 grams for a standard ounce — a difference of about ten per cent. It is the single most common reason two people quoting the same weight appear to disagree with each other.',
  },
  {
    question: 'What is a hallmark, and what if my piece has not got one?',
    answer:
      'A hallmark is a set of marks struck into a piece recording its fineness, and often who submitted it and where it was tested. It is usually found inside a ring band, on a clasp, or on the reverse of a pendant. Plenty of genuine gold carries no hallmark at all — it may be worn away, the piece may predate marking requirements, or it may have been made where marking is not customary. An unmarked piece is not a problem; it simply means fineness is established by examination rather than read off the metal.',
  },
  {
    question: 'Why might my piece be worth less than its total weight suggests?',
    answer:
      'Because not all of what you are holding is gold. Stones, clasps, spring mechanisms, pins and solder all add weight without adding precious metal, and plated items carry only a microscopic layer of gold over a base metal. A professional evaluation separates these out and tells you what it has excluded, which is why an itemised assessment and a single lump figure can differ considerably.',
  },
  {
    question: 'Should I clean or repair anything before bringing it in?',
    answer:
      'No. Cleaning risks damaging stones, softening old settings or removing patina that matters on antique pieces, and a repair almost never returns more than it costs. Bring items exactly as they are, including broken ones — a snapped chain and a single earring are perfectly normal things to have assessed.',
  },
  {
    question: 'Can I get a valuation over the phone or from a photograph?',
    answer:
      `No, and you should be wary of anyone who offers one. A figure quoted before a piece has been weighed and examined is a guess. ${brand.shortName} establishes value in person, from measured weight and verified fineness. Photographs sent with an enquiry are useful for preparing, but they are not a valuation.`,
  },
];

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
            <span className="italic text-gold-high/90"> before you decide anything</span>
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
          <Link href="/request-a-valuation" className="btn-primary">
            <span className="relative z-10">Request a Private Valuation</span>
          </Link>
          <Link href="/contact" className="btn-ghost">
            Ask Something Else
          </Link>
        </div>
      </div>
    </Section>
  );
}

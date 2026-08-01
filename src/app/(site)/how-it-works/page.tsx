import type { Metadata } from 'next';
import Link from 'next/link';
import { Eyebrow, Section } from '@/components/ui/primitives';
import { pageMetadata } from '@/lib/seo';

/**
 * HOW IT WORKS — the dedicated page behind the nav item.
 *
 * A first-time seller's real questions are procedural: what happens when I
 * walk in, what do they do with my things, when do I decide. This page walks
 * the counter process in the order it happens. It states the shape of a
 * proper assessment — the same four stages the homepage dramatises — without
 * making a single claim that belongs to the verified-facts system: no fees,
 * no timings, no payment methods. Those appear only once the business
 * confirms them.
 */

const TITLE = 'How It Works — Selling Gold Over the Counter';
const DESCRIPTION =
  'What actually happens when you sell gold at a counter: examination and weighing in front of you, an itemised offer against the live market, and a decision that stays entirely yours.';

export const metadata: Metadata = pageMetadata(
  "how-it-works",
  "/how-it-works",
  { title: TITLE, description: DESCRIPTION },
);

export default function HowItWorksPage() {
  return (
    <Section material="steel" labelledBy="hiw-heading" className="pb-24 pt-36 lg:pb-36 lg:pt-44">
      <div className="shell">
        <div className="mx-auto max-w-3xl">
          <Eyebrow className="mb-8">How It Works</Eyebrow>
          <h1 id="hiw-heading" className="font-display text-chapter font-normal text-ivory">
            From weight
            <span className="accent-italic text-gold-high/90"> to true value</span>
          </h1>
          <p className="mt-8 max-w-xl text-lead text-ivory/72">
            Four stages, in a fixed order, with nothing agreed until the last
            one. Each stage produces a fact the next one depends on — which is
            what separates a measured valuation from a number said out loud.
          </p>

          <div className="article-body mt-14">
            <h2>Stage one: bring it in</h2>
            <p>
              Come to the counter with whatever you have — jewellery, coins,
              bars, or a drawer of unsorted odds and ends. Nothing needs
              cleaning, repairing, sorting or pre-valuing, and there is no
              minimum worth bringing. Broken chains, single earrings and
              pieces with the stones still in them are all perfectly normal
              things to have assessed. If you are unsure whether something is
              even gold or silver, that question is part of the service, not a
              prerequisite for it.
            </p>
            <p>
              The one preparation genuinely worth doing is understanding the
              units before you arrive. Precious metals are weighed in troy
              ounces — 31.1035 grams, about ten per cent heavier than the
              everyday ounce — and purity is stated in carats or parts per
              thousand. Both are explained plainly in our{' '}
              <Link href="/purity-and-weight">purity and weight guide</Link>,
              and knowing them is the difference between following a valuation
              and merely hearing one.
            </p>

            <h2>Stage two: weighed in front of you</h2>
            <p>
              Every item is examined and weighed at the counter while you
              watch. Nothing is taken to a back room, and the scale stays
              where you can see it — the weight is read out as it is taken,
              from the display you are looking at. This is not a courtesy; it
              is the whole basis of trust in a trade where the product is
              measured rather than described.
            </p>
            <p>
              Examination means more than the scale. Hallmarks are read under
              magnification, and where a mark is worn, missing, or looks
              wrong, the metal is tested rather than assumed. Items that mix
              materials — a gold ring with stones, a bracelet with a steel
              spring clasp — are assessed for their actual recoverable metal,
              with the non-gold components allowed for openly rather than
              silently weighed in your favour or against it.
            </p>

            <h2>Stage three: an offer against the market</h2>
            <p>
              A serious offer has three visible parts: what the metal weighs,
              how pure it is, and the market reference it is being measured
              against. Precious-metal prices move through the trading day, so
              the figure relates to the market at the moment of assessment —
              and the working is shown rather than summarised. You should be
              able to see how weight, fineness and the reference price
              produced the number, because a figure you can check is worth
              more than a bigger figure you cannot.
            </p>
            <p>
              This is also where the two-reading rule for coins applies: if a
              coin is worth more as a coin than as metal — a rare date, a low
              mintage, an unusual strike — that is said plainly, rather than
              pricing a collectable as scrap. The same honesty runs the other
              way: plated items and rolled gold are identified as what they
              are, before any number is put on the table.
            </p>

            <h2>Stage four: accept, or take it home</h2>
            <p>
              If the figure suits you, the sale completes there and then. If
              it does not, your items go back in your pocket, and that
              outcome is treated as an ordinary one — not a negotiation
              tactic, not a failure. There is no obligation at any point, and
              declining today does not prejudice a different decision next
              month. Gold does not spoil.
            </p>
            <p>
              Between those two outcomes sits a third, underused option:
              taking the itemised figures away with you. Because the working
              is shown, the assessment is portable — you can compare it, sit
              with it, or check it against the market reference yourself.
            </p>

            <h2>Why the order matters</h2>
            <p>
              Each stage exists to protect the one after it. Weighing in
              front of you makes the weight a shared fact rather than a
              claim. Establishing fineness before any money is discussed
              means the offer is built on measurements you witnessed. And
              putting the decision last — after every number is on the table
              — means you are never asked to commit to a figure you have not
              seen constructed. Any process that runs these stages in a
              different order is asking for trust it has not yet earned.
            </p>

            <h2>The questions this page cannot answer</h2>
            <p>
              Fees, appointment arrangements, payment methods, identification
              requirements and timing are commitments only the business can
              make, and this site does not state them until they are
              confirmed — a policy that applies to every fact on every page.
              What has been confirmed is always current on the{' '}
              <Link href="/contact">contact page</Link>, and the{' '}
              <Link href="/faq">FAQ</Link> covers the general questions in
              plain language.
            </p>
          </div>

          <div className="mt-16 flex flex-wrap gap-4 border-t border-gold-antique/16 pt-10">
            <Link href="/contact" className="btn-primary">
              <span className="relative z-10">Visit Our Shop</span>
            </Link>
            <Link href="/#journey" className="btn-ghost">
              See the four stages
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}

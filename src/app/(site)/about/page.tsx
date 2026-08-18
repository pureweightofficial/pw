import type { Metadata } from 'next';
import Link from 'next/link';
import { Eyebrow, Fact, Placeholder, Section } from '@/components/ui/primitives';
import { brand, business, isVerified } from '@/lib/site';
import { pageMetadata } from '@/lib/seo';

/**
 * ABOUT — the dedicated page behind the nav item.
 *
 * The hardest page to write honestly, because "about" pages are where
 * businesses traditionally invent themselves: founding myths, years of
 * combined experience, values nobody voted on. This one is built the other
 * way round. The APPROACH — measurement over persuasion, working shown,
 * decisions kept with the customer — is brand voice this site already
 * publishes and stands behind. The HISTORY — founding story, founder's
 * message, credentials — renders from the verified-facts system: real when
 * confirmed, visibly pending when not. No third option exists.
 */

const TITLE = 'About Pureweight — Measurement Over Persuasion';
const DESCRIPTION =
  'What Pureweight Gold Exchange is built on: items weighed in front of you, the working shown before any decision, and a valuation you can check rather than take on faith.';

export const metadata: Metadata = pageMetadata(
  "about",
  "/about",
  { title: TITLE, description: DESCRIPTION },
);

export default function AboutPage() {
  return (
    <Section material="steel" labelledBy="about-heading" className="pb-24 pt-36 lg:pb-36 lg:pt-44">
      <div className="shell">
        <div className="mx-auto max-w-3xl">
          <Eyebrow className="mb-8">About</Eyebrow>
          <h1 id="about-heading" className="font-display text-chapter text-ivory">
            Weight can be measured.
            <span className="accent-italic text-gold-high/90"> Trust must be earned.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lead text-ivory/72">
            {brand.name} buys gold and silver over the counter — and is built
            on a single observation about this trade: the customer usually
            cannot check anything they are told. Everything about how we work
            exists to fix that.
          </p>

          <div className="article-body mt-14">
            <h2>The asymmetry this business exists to close</h2>
            <p>
              Most people sell gold once or twice in their lives, often at a
              difficult moment — an estate to settle, a household to fund, a
              chapter to close. They arrive not knowing what their items
              weigh, what the marks inside a ring band mean, or what the
              metal is trading at that morning. The buyer, meanwhile, knows
              all three. That imbalance is the whole problem with this trade,
              and every questionable practice in it — the back-room weighing,
              the single unexplained figure, the pressure to decide now —
              survives because of it.
            </p>
            <p>
              The fix is not friendlier marketing. It is structural: run the
              transaction so that every fact in it can be checked by the
              person on the other side of the counter, while they stand
              there.
            </p>

            <h2>What that means in practice</h2>
            <p>
              Three commitments, each one checkable in the room. First, the
              scale stays where you can see it, and every item is examined
              and weighed in front of you — the weight becomes a shared fact
              rather than a claim. Second, the working is shown: weight,
              fineness, and the market reference they are read against, so
              you can follow how the figure was constructed instead of being
              handed its conclusion. Third, the decision stays yours, made
              after all the numbers are on the table, with taking your items
              home treated as an ordinary outcome rather than a negotiation
              failure.
            </p>
            <p>
              None of this is charity — it is simply what measurement looks
              like when it has nothing to hide. A figure you can verify is
              worth more than a bigger figure you cannot, and a business that
              shows its working can be held to it. The full sequence is laid
              out step by step in <Link href="/how-it-works">how it works</Link>.
            </p>

            <h2>Plain language as policy</h2>
            <p>
              The vocabulary of this trade — carat, millesimal fineness,
              troy ounces, hallmarks — is simple once someone bothers to
              explain it, and opaque when nobody does. We publish the
              explanations: a working reference on{' '}
              <Link href="/purity-and-weight">purity and weight</Link>, plain
              answers in the <Link href="/faq">FAQ</Link>, and articles in{' '}
              <Link href="/insights">insights</Link> written to close the
              knowledge gap before the conversation starts, not after it.
              A customer who understands the units can check the arithmetic;
              a customer who can check the arithmetic does not need to trust
              anyone&apos;s tone of voice.
            </p>

            <h2>What this page will not do</h2>
            <p>
              You may notice what is missing here: no founding legend, no
              &ldquo;decades of combined experience&rdquo;, no wall of
              certificates. That is deliberate, and it is the same policy
              that governs every fact on this site — nothing is published
              until the business has confirmed it. The sections below render
              directly from that system: where a detail has been verified it
              appears as fact, and where it has not, the gap is shown
              honestly rather than papered over with something plausible.
            </p>
          </div>

          {/* ----- Verified-facts block: real when confirmed, honest when not ----- */}
          <div className="mt-16 space-y-10 border-t border-gold-antique/16 pt-12">
            <div>
              <h2 className="label mb-4">In the founder&apos;s words</h2>
              {isVerified(business.founderMessage) ? (
                <p className="text-lead text-ivory/72">
                  <Fact field={business.founderMessage} />
                </p>
              ) : (
                <>
                  <Placeholder label="[INSERT FOUNDER MESSAGE]" />
                  <p className="mt-2 text-xs leading-relaxed text-ash">
                    A message in the founder&apos;s own words, published once
                    the founder has written and approved it — not before.
                  </p>
                </>
              )}
            </div>

            <div>
              <h2 className="label mb-4">The founding story</h2>
              {isVerified(business.foundingStory) ? (
                <p className="text-lead text-ivory/72">
                  <Fact field={business.foundingStory} />
                </p>
              ) : (
                <>
                  <Placeholder label="[INSERT VERIFIED FOUNDING STORY]" />
                  <p className="mt-2 text-xs leading-relaxed text-ash">
                    When and why the business was founded, as confirmed by the
                    business. An invented origin story would undermine every
                    other claim on this site.
                  </p>
                </>
              )}
            </div>

            <div>
              <h2 className="label mb-4">Where to find us</h2>
              <p className="text-lead text-ivory/72">
                <Fact field={business.address} link="map" />
              </p>
              <p className="mt-3 text-sm text-ash">
                Opening hours and telephone are published on the{' '}
                <Link href="/contact" className="text-gold-rich underline hover:text-gold-high">
                  contact page
                </Link>{' '}
                as they are confirmed.
              </p>
            </div>
          </div>

          <div className="mt-16 flex flex-wrap gap-4 border-t border-gold-antique/16 pt-10">
            <Link href="/contact" className="btn-primary">
              <span className="relative z-10">Visit Our Shop</span>
            </Link>
            <Link href="/#story" className="btn-ghost">
              The approach, on the homepage
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}

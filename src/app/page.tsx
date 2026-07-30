import type { Metadata } from 'next';
import { canonicalPath, ogFor } from '@/lib/site';
import { Appointment } from '@/components/sections/Appointment';
import { AssayExperience } from '@/components/sections/AssayExperience';
import { BrandStory } from '@/components/sections/BrandStory';
import { FinalBalance } from '@/components/sections/FinalBalance';
import { Hero } from '@/components/sections/Hero';
import { Insights } from '@/components/sections/Insights';
import { Services } from '@/components/sections/Services';
import { Testimonials } from '@/components/sections/Testimonials';
import { TrustEvidence } from '@/components/sections/TrustEvidence';
import { TrustStatement } from '@/components/sections/TrustStatement';
import { ValuationJourney } from '@/components/sections/ValuationJourney';
import { WhyPureweight } from '@/components/sections/WhyPureweight';

export const metadata: Metadata = {
  title: 'Pureweight Gold Exchange — Private Gold Valuation & Exchange',
  description:
    'Private gold evaluation and exchange guided by precision, transparency and trusted expertise. Weight, purity and condition examined and explained before any figure is discussed.',
  alternates: { canonical: canonicalPath('/') },
  // Complete block per page: Next replaces openGraph wholesale rather than
  // deep-merging, so a partial one silently drops og:image/site_name/type and
  // an absent one inherits the HOMEPAGE og:url on every subpage.
  openGraph: ogFor({
    title: 'Pureweight Gold Exchange — Private Gold Valuation & Exchange',
    description:
      'Private gold evaluation and exchange guided by precision, transparency and trusted expertise. Weight, purity and condition examined and explained before any figure is discussed.',
    path: '/',
  }),
};

/**
 * HOMEPAGE
 *
 * Fourteen sections, in the order a hesitant visitor actually needs them:
 *
 *   Hero            the instrument, and what this is
 *   Trust           how you will be treated — before any selling
 *   Journey         what will happen, in four stages
 *   Services        what can be examined
 *   Assay           how gold is measured, taught honestly
 *   Pillars         what will not be compromised
 *   Appointment     the conversation, on the page rather than a click away
 *   Story           who this is and why
 *   Evidence        what can be independently checked
 *   Testimonials    what others said (awaiting genuine content)
 *   Insights        what to know before you sell
 *   Finale          the balance reaching true, and the ask
 *
 * Trust deliberately precedes the sell, and the enquiry form sits mid-page
 * rather than only at the bottom — a visitor convinced by the process section
 * should not have to scroll past four more chapters to act on it.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustStatement />
      <ValuationJourney />
      <Services />
      <AssayExperience />
      <WhyPureweight />
      <Appointment />
      <BrandStory />
      <TrustEvidence />
      <Testimonials />
      <Insights />
      <FinalBalance />
    </>
  );
}

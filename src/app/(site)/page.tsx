import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Appointment } from "@/components/sections/Appointment";
import { AssayExperience } from "@/components/sections/AssayExperience";
import { BrandStory } from "@/components/sections/BrandStory";
import { FinalBalance } from "@/components/sections/FinalBalance";
import { Hero } from "@/components/sections/Hero";
import { Insights } from "@/components/sections/Insights";
import { Services } from "@/components/sections/Services";
import { Testimonials } from "@/components/sections/Testimonials";
import { TrustEvidence } from "@/components/sections/TrustEvidence";
import { TrustStatement } from "@/components/sections/TrustStatement";
import { ValuationJourney } from "@/components/sections/ValuationJourney";
import { WhyPureweight } from "@/components/sections/WhyPureweight";
import { GoldWorld } from "@/components/ui/GoldWorld";

/*
  Title and description come from src/content/seo.json via the Keeper. The
  literals below are the fallback if that entry is ever blanked — they are the
  copy this page shipped with, so an editing accident restores the original
  rather than producing a titleless homepage.
*/
export const metadata: Metadata = pageMetadata("home", "/", {
  title: "Pureweight Gold Exchange — We Buy Gold, Silver, Coins & Bullion",
  description:
    "We buy gold and silver over the counter — jewellery, coins and bullion. Your items examined and weighed in front of you, with the figure explained before you decide. Live market reference prices.",
});

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
      {/*
        THE PERSISTENT WORLD, ON THIS PAGE ONLY.

        One WebGL context for the whole document, fixed behind the content, with
        every section surface above it translucent so the same gold mass reads
        through the entire page. It lives here rather than in (site)/layout.tsx
        because the story it tells — weight, purity, market, value — is this
        page's story. On /contact it would be decoration behind a form, and a
        renderer nobody asked for on eight pages that do not use it.

        FireflyBackdrop stands itself down on "/" so the two never stack.

        WHY IT IS NOT VISIBLE BEHIND THE HERO: the hero is a full-bleed brand
        film in the content layer. Nothing rendered behind an opaque
        full-viewport video shows through it, by construction. The world reads
        from TrustStatement downward.

        WHAT PAID FOR IT: --surface-alpha in globals.css moved 55% -> 81%,
        binary-searched with `npm run check:scene-contrast`, because a lit solid
        behind translucent surfaces dropped body copy to 1.94:1 against a WCAG
        AA floor of 4.5:1. Re-run that gate after touching the world, this page,
        or that variable.
      */}
      <GoldWorld />
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

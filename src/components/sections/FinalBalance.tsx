"use client";

import { VisitCta } from "@/components/ui/VisitCta";
import { AmbientGlow } from "@/components/ui/AmbientGlow";
import { opener } from "@/lib/copy";

const copy = opener("finale", {
  eyebrow: "In Balance",
  heading: "Know the true value",
  accent: "of what you hold.",
  lead: "Bring your items in. We will examine and weigh them with you, and explain every figure before you decide.",
});

/**
 * FINAL BALANCE
 *
 * The story closes where it opened, at the instrument — but closer, warmer, and
 * at rest. The sequence runs once as the section is scrolled into view: the
 * pans align, the pointer reaches zero, a single warm reflection crosses the
 * beam, and then nothing moves again.
 *
 * That last part is the whole point. A balance that keeps re-swinging is a
 * balance that has not settled, and this section's entire claim is that it has.
 * `FinaleScene` latches its sweep so it cannot replay while the section stays
 * on screen.
 */


export function FinalBalance() {
  return (
    <section
      id="finale"
      data-scroll-section="finale"
      aria-labelledby="finale-heading"
      /*
        THE COPY SITS HIGH SO THE INSTRUMENT CAN BE WHOLE.

        `items-center` put a ~400px copy block in the middle of the section and
        left the balance to fight for whatever was underneath it — which was
        never enough, so the scale was cropped through its pans by the footer
        edge and its pillar and foot were never visible at any scroll position.
        Three review passes described the closing instrument as "amputated",
        "guillotined mid-instrument", "the base is never shown". A balance with
        no base does not read as an instrument at rest; it reads as a broken
        crop, in the one section whose entire claim is that things have settled.

        The section is a full screen now, and the copy is anchored to its upper
        portion, which leaves a deliberate lower band for the instrument to
        stand in complete.
      */
      /*
        Centred again. The upper-anchored layout with 16vh of top padding
        existed to leave a lower band for the instrument to stand in; with the
        instrument retired that band is just a hole, and the copy belongs in
        the middle of the section it owns.
      */
      className="relative isolate flex min-h-[92svh] items-center overflow-hidden bg-void py-24 lg:min-h-screen"
    >
      <AmbientGlow intensity="warm" placement="centre" />
      {/*
        THE CLOSING BALANCE IS GONE.

        A procedural scale stood here, and it was the section's whole payoff —
        composed by arithmetic into the clear band below the copy after two
        earlier framings failed. The owner's verdict on it, seeing it on a real
        window rather than the 1440x900 this was tuned against: an unreal item.
        And they were looking at a genuine bug as well as a judgement — at
        shorter viewport heights the beam ran straight through the CTA row,
        crossing "Opening hours & directions" with a bar of brass. The
        composition was only ever correct at one window size.

        What replaces it is not nothing. The persistent world renders behind
        this section like every other (see (site)/layout.tsx), so the finale
        closes on moving gold — one object, the page's own, rather than a
        second instrument staged on top of it.
      */}

      {/*
        THE SCRIM WAS BLACKING OUT THE ONE THING THE SECTION IS FOR.

        It ran `from-void via-void/62 to-void/35` bottom-to-top — fully opaque
        at the BOTTOM, which is exactly where the camera puts the instrument
        (the scene group sits at y -1.28 and the lens is above it). So the
        closing scene rendered correctly, every frame, into a band of solid
        black. Four independent design passes recorded the finale as "nearly
        black", "a void", "the scroll story ends without a payoff", and one
        opaque gradient was the whole reason.

        The replacement is a BAND, not a ramp: heavy across the middle where
        the headline, lead and CTA sit, clearing above and below so the beam
        and pans read. The heavy stops are unchanged in strength from the old
        middle value, so the copy keeps the contrast it had — the change is
        entirely in what happens outside the text block.
      */}
      {/*
        A gentle centre weight, not the tight ellipse that used to protect the
        copy from the instrument's key light. With only the world behind this
        section, the copy needs the same modest help every other section's
        copy gets — and check:scene-contrast measures it either way.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 78% 60% at 50% 50%, rgba(3,3,3,0.72) 0%, rgba(3,3,3,0.5) 60%, rgba(3,3,3,0.12) 100%)",
        }}
      />

      <div className="shell relative w-full" data-cursor-normal>
        <div className="mx-auto max-w-3xl text-center">
          <p className="label mb-8 will-reveal">{copy.eyebrow}</p>

          <h2
            id="finale-heading"
            className="font-display text-chapter text-ivory will-reveal"
          >
            {copy.heading}
            <br />
            <span className="gold-leaf accent-italic">{copy.accent}</span>
          </h2>

          <p className="mx-auto mt-8 max-w-lg text-lead text-ivory/72 will-reveal">
            {copy.lead}
          </p>

          <div className="mt-12 flex justify-center will-reveal">
            <VisitCta crescendo />
          </div>
        </div>
      </div>
    </section>
  );
}

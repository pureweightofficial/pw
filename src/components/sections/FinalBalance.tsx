"use client";

import dynamic from "next/dynamic";
import { useSceneGate } from "@/lib/scene-gate";
import { VisitCta } from "@/components/ui/VisitCta";
import { ScalePoster } from "@/components/webgl/ScalePoster";
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

const FinaleCanvas = dynamic(
  () => import("@/components/webgl/canvases").then((m) => m.FinaleCanvas),
  { ssr: false, loading: () => <ScalePoster /> },
);

export function FinalBalance() {
  // Decided before the renderer is imported — see lib/scene-gate.
  const gate = useSceneGate();

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
      className="relative isolate flex min-h-screen items-start overflow-hidden bg-void pt-[16vh] pb-24"
    >
      <AmbientGlow intensity="warm" placement="centre" />
      <div
        className="vignette absolute inset-0 -z-10"
        aria-hidden="true"
        data-webgl-surface
      >
        {gate === "canvas" ? <FinaleCanvas /> : <ScalePoster />}
      </div>

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
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          /*
            SCOPED TO THE COPY, NOT FULL-BLEED.

            The previous version was an improvement on the one before it — a
            band rather than a bottom-heavy ramp — but it still ran the full
            width of the section at rgba(3,3,3,0.78) across the middle, and the
            instrument sits inside that band's lower edge. So the scene was
            still being rendered into a 78%-black veil, and a review reading
            the page cold still recorded the finale as the darkest moment on it:
            dimmer than the hero, dimmer than the medallions, dimmer than the
            footer logo.

            An ellipse centred on the copy protects exactly what needs
            protecting — the headline, the lead and the CTA — and leaves the
            rest of the frame clean for the balance. Copy contrast is measured
            by scripts/check-section-scene-contrast.mjs, which samples the real
            text boxes; the instrument is now outside every one of them.
          */
          background:
            "radial-gradient(ellipse 62% 42% at 50% 30%, rgba(3,3,3,0.88) 0%, rgba(3,3,3,0.8) 55%, rgba(3,3,3,0.34) 80%, rgba(3,3,3,0.06) 100%)",
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

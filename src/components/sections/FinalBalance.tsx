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
      className="relative isolate flex min-h-[92svh] items-center overflow-hidden bg-void py-24 lg:min-h-screen"
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
          background:
            "linear-gradient(to top, rgba(3,3,3,0.10) 0%, rgba(3,3,3,0.22) 26%, rgba(3,3,3,0.78) 42%, rgba(3,3,3,0.78) 88%, rgba(3,3,3,0.42) 100%)",
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
            <VisitCta />
          </div>
        </div>
      </div>
    </section>
  );
}

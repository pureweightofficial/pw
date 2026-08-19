"use client";

import { useEffect, useRef } from "react";
import { scrollState } from "@/lib/scroll-store";

/**
 * THE PLUMB LINE — the page's one persistent instrument.
 *
 * A gold hairline down the left margin, filled from the top to wherever the
 * reader has got to, with a small struck marker riding the boundary.
 *
 * WHY IT EXISTS
 *
 * Two faults, one device. Four independent design reviews of this homepage
 * agreed on both:
 *
 *  - "the balance-beam motif exists but is abandoned — no persistent scroll
 *    thread". The beam appears as a divider between chapters and then has
 *    nothing to do with the scroll it is meant to be measuring.
 *  - "systemic dead bands", "chapter transitions are dead viewports", "300 to
 *    450px of pure unmodulated black with no anchoring element". A pause in a
 *    well-made page still carries something; these carried nothing, so they
 *    read as template padding rather than as composure.
 *
 * A plumb line answers both, and it is the honest instrument for this
 * business: it is the tool that establishes true vertical, the way the balance
 * establishes true weight. It gives every quiet band a reason to be quiet —
 * there is one thing in it, and it is moving.
 *
 * WHAT IT COSTS
 *
 * Nothing measurable. It is two absolutely-positioned divs whose `transform`
 * is written straight to the DOM node inside an existing animation frame, so
 * it never triggers layout or paint, never re-renders React, and never touches
 * the compositor budget the windowed-scene architecture is protecting. There
 * is no canvas here and there must never be one: a full-height fixed canvas is
 * the ~43fps recompositing cost this site removed on purpose.
 *
 * WHERE IT IS NOT
 *
 * Below `lg`, because a narrow viewport needs its margins for text, and a
 * decorative rail in a 24px gutter is clutter rather than composure. Under
 * `prefers-reduced-motion` it renders complete and still, at full fill: a
 * reader who has asked for no motion gets the mark, not the travelling.
 */
export function PlumbLine() {
  const fillRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced) {
      // Complete and still. `progress` is never read, so the line does not
      // depend on a scroll listener that reduced-motion readers may not drive.
      if (fillRef.current) fillRef.current.style.transform = "scaleY(1)";
      if (markerRef.current) markerRef.current.style.opacity = "0";
      return;
    }

    let raf = 0;
    const tick = () => {
      /*
        scrollState.progress is the whole-document channel MotionProvider
        already maintains for the page — the same single source of truth the
        beam dividers tilt on. Reading it here rather than adding a listener
        means the rail can never disagree with the rest of the page about how
        far down it is.
      */
      const p = Math.max(0, Math.min(1, scrollState.progress));

      if (fillRef.current) {
        fillRef.current.style.transform = `scaleY(${p.toFixed(4)})`;
      }
      if (markerRef.current) {
        markerRef.current.style.transform = `translateY(${(p * 100).toFixed(3)}%)`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-[calc(var(--nav-h)+3.5rem)] bottom-14 left-7 z-30 hidden w-px lg:block"
    >
      {/* The line itself: present for its whole length, faint. */}
      <div className="absolute inset-0 bg-gold-antique/16" />

      {/* Travelled: brighter, and scaled from the top so the transform is the
          only thing that changes. */}
      <div
        ref={fillRef}
        className="absolute inset-0 origin-top bg-linear-to-b from-gold-high/70 to-gold-antique/45"
        style={{ transform: "scaleY(0)" }}
      />

      {/*
        The struck marker riding the boundary — the same 7px rotated square
        the journey rail uses for its stage nodes, so the two read as one
        family of instrument rather than two decorations.

        IT IS WRAPPED, and the wrapper is what moves. A percentage translate
        resolves against the TRANSLATED ELEMENT'S OWN box, so translating the
        7px marker by 100% moved it seven pixels down a 700px rail — the
        marker sat at the top of the line looking broken while the fill
        beneath it advanced correctly. The wrapper is `inset-0`, so its 100%
        IS the rail's height, and the marker rides it.
      */}
      <div
        ref={markerRef}
        className="absolute inset-0 origin-top"
        style={{ transform: "translateY(0%)" }}
      >
        <div className="absolute top-0 -left-[3px] h-[7px] w-[7px] rotate-45 border border-gold-high/80 bg-void" />
      </div>
    </div>
  );
}

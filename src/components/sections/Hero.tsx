"use client";

import { useCallback, useState } from "react";
import { HeroVideo } from "@/components/hero/HeroVideo";
import { useMotion } from "@/components/motion/MotionProvider";
import { CTA } from "@/components/ui/primitives";
import { VisitCta } from "@/components/ui/VisitCta";
import { opener } from "@/lib/copy";

const heroCopy = opener("hero", {
  eyebrow: "Precision in Every Gram",
  heading: "Where Gold Finds",
  accent: "Its True Weight.",
  lead: "We buy gold and silver over the counter — jewellery, coins and bullion. Your items examined and weighed in front of you, against the live market.",
});

/**
 * HERO
 *
 * TWO RULES KEEP THE COPY CLEAR OF THE FIXED NAVIGATION:
 *
 *  1. It reserves --nav-h before centring, so the bar never sits on top of the
 *     eyebrow line.
 *  2. It centres SAFELY. Plain `justify-content: center` overflows equally in
 *     both directions when the content is taller than the viewport, pushing the
 *     top of the block above the fold and behind the navigation — which is
 *     exactly what happened on short windows. `safe center` falls back to
 *     flex-start instead of losing content off the top edge.
 *
 * The instrument is the image; the copy is the message. They are kept out of
 * each other's way rather than layered on top of one another:
 *
 *  - the headline occupies the upper-left, over empty room;
 *  - the instrument is nudged right of centre, where the composition has weight;
 *  - a gradient scrim runs left-to-right behind the text block only, so the
 *    copy always clears its contrast threshold without dimming the subject.
 *
 * THE SUBJECT IS THE SUPPLIED FILM, NOT THE PROCEDURAL SCALE. Both are a gold
 * balance on black, and two of them in one frame read as a mistake, so the
 * WebGL instrument was withdrawn from the hero and kept where it is genuinely
 * interactive — the assay panel and the closing section.
 *
 * That removes the only EAGER WebGL mount on the site: the hero used to create a
 * context, upload procedural textures and compile shaders while it was the thing
 * the visitor was looking at. Nothing above the fold waits on three.js now.
 *
 * It does NOT remove three.js from the page. The assay and closing sections
 * still reach it through next/dynamic at module scope, and those components
 * render on load, so the chunk is still fetched — deferred and non-blocking, but
 * fetched.
 *
 * This paragraph used to end by listing "gate that import on viewport proximity"
 * as an open performance item. It was measured, and it is closed: not worth
 * doing. On a 4x-throttled mobile profile the 950KB chunk is requested at
 * 8500ms and finishes at 16191ms — the load event is at 6744ms, so the fetch
 * begins nearly two seconds AFTER the page has loaded. `next/dynamic` has
 * already moved it clear of the critical path; there is no first-paint left for
 * proximity gating to win. Measured against the same profile with the scene
 * skipped entirely: LCP 4932ms with 3D against 4860ms without, a 72ms gap
 * inside a run-to-run spread of 4924-6156ms. Noise, not signal.
 *
 * What the chunk does still cost is 758ms of extra long-task time (1692ms
 * against 934ms) as three.js compiles — all of it after load. Proximity gating
 * would not remove that work, only move it to the moment the visitor scrolls a
 * scene into view, which is the worst moment to spend it. The saving that is
 * real belongs to lib/scene-gate, which skips the download and the compile
 * together for anyone who was never going to see a scene.
 *
 * The scrim is heavier here than a WebGL hero needed. The film's backdrop is a
 * mid-grey studio sweep rather than near-black, so the copy column has to be
 * darkened further to hold its contrast ratio.
 *
 * All of the text is real, server-rendered HTML sitting *outside* the media.
 * The hero reads identically to a crawler, a screen reader, a visitor on a
 * metered connection and a visitor who has asked for no motion.
 */

export function Hero() {
  const { scrollTo } = useMotion();

  /**
   * The film's pause state lives here rather than inside HeroVideo, because the
   * control cannot live inside HeroVideo. The media sits in a `-z-10` layer with
   * the scrims stacked over it, so a button in there would be painted under —
   * and click-blocked by — a scrim. It has to be a sibling at the section's own
   * stacking level.
   */
  const [filmPaused, setFilmPaused] = useState(false);
  const [filmActive, setFilmActive] = useState(false);

  // Stable identity: HeroVideo reports through this from an effect, so a fresh
  // function each render would loop.
  const handleActiveChange = useCallback((active: boolean) => {
    setFilmActive(active);
  }, []);

  return (
    <section
      data-scroll-section="hero"
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-void pb-16 pt-28 sm:pb-20 lg:min-h-screen lg:justify-center lg:[justify-content:safe_center] lg:pb-0 lg:pt-[calc(var(--nav-h)+2.5rem)]"
    >
      {/* --- The scene ------------------------------------------------- */}
      {/* No data-webgl-surface here any more: the hero is a film, and the scene
          cursor's "Explore" affordance would be promising an interaction that
          does not exist. It still applies to the assay and closing scenes. */}
      <div className="vignette absolute inset-0 -z-10" aria-hidden="true">
        <HeroVideo paused={filmPaused} onActiveChange={handleActiveChange} />
      </div>

      {/* Directional scrim: heaviest behind the copy, clear over the subject.
          Moved out to a CSS class because the wide-viewport ramp needs six stops
          to hold WCAG AA against the film's specular highlights — the numbers
          are a measured result and are documented at .hero-scrim. */}
      <div aria-hidden="true" className="hero-scrim absolute inset-0 -z-10" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-linear-to-t from-void to-transparent"
      />
      {/* Aurora's elliptical falloff — closes the frame edges around the
          instrument so it sits in a pool of light rather than on a flat field. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,transparent_0%,rgba(0, 0, 0,0.72)_70%,var(--color-void)_100%)]"
      />

      {/* --- The copy -------------------------------------------------- */}
      <div className="shell relative w-full" data-cursor-normal>
        {/* 4xl, not 2xl: the capitals headline needs the wider measure to hold
            two lines. The lead paragraph keeps its own tighter max-w-xl. */}
        <div className="max-w-4xl">
          <p className="label mb-9 hero-rise">{heroCopy.eyebrow}</p>

          <h1
            id="hero-heading"
            className="hero-rise font-display text-hero font-normal text-ivory [--rise-delay:120ms]"
          >
            {/*
              The space between these two spans is load-bearing even though
              both are display:block and it changes nothing visually. Without
              it the H1's text content is "Where Gold FindsIts True Weight." —
              which is what a crawler extracts, what an AI answer engine would
              quote, and what a screen reader announces. Every other section
              already separates heading from accent with {" "}; the H1, of all
              places, was the one that did not.
            */}
            <span className="block">{heroCopy.heading}</span>{" "}
            <span className="gold-leaf accent-italic block">
              {heroCopy.accent}
            </span>
          </h1>

          <p className="hero-rise mt-8 max-w-xl text-lead text-ivory/72 [--rise-delay:240ms]">
            {heroCopy.lead}
          </p>

          <div className="hero-rise mt-11 flex flex-col items-start gap-4 [--rise-delay:360ms] sm:flex-row sm:items-center sm:gap-7">
            {/* No form: this trade happens at the counter. See VisitCta. */}
            <VisitCta primaryOnly />

            <CTA
              variant="ghost"
              magnetic={false}
              onClick={() => scrollTo("#services")}
              aria-label="See what we buy"
            >
              What We Buy
              <span aria-hidden="true" className="text-gold-antique">
                ↓
              </span>
            </CTA>
          </div>
        </div>
      </div>

      {/* --- Scroll indicator ------------------------------------------ */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-6 hidden justify-center lg:flex"
      >
        <div className="flex flex-col items-center gap-3">
          <span className="text-[0.56rem] tracking-[0.34em] text-ash uppercase">
            Scroll
          </span>
          {/* A chain: the hero's suspension detail, reduced to a scroll cue. */}
          <span className="relative block h-12 w-px bg-linear-to-b from-gold-antique/50 to-transparent">
            <span className="pw-scroll-dot absolute left-1/2 top-0 block h-2.5 w-2.5 rounded-full border border-gold-antique/60" />
          </span>
        </div>
      </div>

      {/* --- Film control (WCAG 2.2 SC 2.2.2) --------------------------- */}
      {/* The film loops indefinitely, and auto-starting motion that runs beyond
          five seconds must be pausable. Rendered only when a film is genuinely
          running: on the reduced-motion, metered-connection and decode-failure
          paths the hero is a still image, and offering to pause a photograph
          would be nonsense.

          It carries its own near-opaque backing rather than inheriting the
          scrim. It sits bottom-right, where the ramp has released to ~16% and the
          film underneath is at its brightest — ash on bare film there measures
          about 1.8:1. On this chip it is ~5:1.

          Last child on purpose: it must paint above the scrims to be clickable. */}
      {filmActive ? (
        <button
          type="button"
          onClick={() => setFilmPaused((previous) => !previous)}
          aria-label={
            filmPaused
              ? "Play the background film"
              : "Pause the background film"
          }
          className="absolute bottom-4 right-4 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-bronze/50 bg-void/85 px-4 text-[0.58rem] tracking-[0.26em] text-ash uppercase backdrop-blur-sm transition-colors duration-300 hover:border-gold-antique/70 hover:text-gold-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-antique sm:bottom-6 sm:right-6"
        >
          <span aria-hidden="true" className="text-[0.7rem] leading-none">
            {filmPaused ? "▶" : "‖"}
          </span>
          {filmPaused ? "Play" : "Pause"}
        </button>
      ) : null}
    </section>
  );
}

'use client';

import { HeroVideo } from '@/components/hero/HeroVideo';
import { useMotion } from '@/components/motion/MotionProvider';
import { CTA } from '@/components/ui/primitives';

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
 * fetched. Gating that import on viewport proximity is a separate open item on
 * the performance list, and is not claimed here.
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
        <HeroVideo />
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
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,transparent_0%,rgba(5,4,6,0.72)_70%,var(--color-void)_100%)]"
      />

      {/* --- The copy -------------------------------------------------- */}
      <div className="shell relative w-full" data-cursor-normal>
        {/* 4xl, not 2xl: the capitals headline needs the wider measure to hold
            two lines. The lead paragraph keeps its own tighter max-w-xl. */}
        <div className="max-w-4xl">
          <p className="label mb-9 hero-rise">Precision in Every Gram</p>

          <h1
            id="hero-heading"
            className="hero-rise font-display text-hero font-normal text-ivory [--rise-delay:120ms]"
          >
            <span className="block">Where Gold Finds</span>
            <span className="gold-leaf accent-italic block">Its True Weight.</span>
          </h1>

          <p className="hero-rise mt-8 max-w-xl text-lead text-ivory/72 [--rise-delay:240ms]">
            Private gold evaluation and exchange, guided by precision, transparency and trusted
            expertise.
          </p>

          <div className="hero-rise mt-11 flex flex-col items-start gap-4 [--rise-delay:360ms] sm:flex-row sm:items-center sm:gap-7">
            <CTA href="/request-a-valuation" className="w-full justify-center sm:w-auto">
              Request a Private Valuation
            </CTA>

            <CTA
              variant="ghost"
              magnetic={false}
              onClick={() => scrollTo('#journey')}
              aria-label="See how the valuation process works"
            >
              See How It Works
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
          <span className="text-[0.56rem] tracking-[0.34em] text-ash uppercase">Scroll</span>
          {/* A chain: the hero's suspension detail, reduced to a scroll cue. */}
          <span className="relative block h-12 w-px bg-linear-to-b from-gold-antique/50 to-transparent">
            <span className="pw-scroll-dot absolute left-1/2 top-0 block h-2.5 w-2.5 rounded-full border border-gold-antique/60" />
          </span>
        </div>
      </div>
    </section>
  );
}

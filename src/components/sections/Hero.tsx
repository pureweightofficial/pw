'use client';

import dynamic from 'next/dynamic';
import { useMotion } from '@/components/motion/MotionProvider';
import { CTA } from '@/components/ui/primitives';
import { ScalePoster } from '@/components/webgl/ScalePoster';

/**
 * HERO
 *
 * The instrument is the image; the copy is the message. They are kept out of
 * each other's way rather than layered on top of one another:
 *
 *  - the headline occupies the upper-left, over empty room;
 *  - the scale is seated low and right, where the composition has weight;
 *  - a gradient scrim runs left-to-right behind the text block only, so the
 *    copy always clears its contrast threshold without dimming the subject.
 *
 * All of the text is real, server-rendered HTML sitting *outside* the canvas.
 * The hero reads identically to a crawler, a screen reader and a visitor whose
 * GPU refused the scene.
 */

const HeroCanvas = dynamic(
  () => import('@/components/webgl/canvases').then((m) => m.HeroCanvas),
  {
    ssr: false,
    // Shown while three.js downloads. Identical composition, so the transition
    // to the live scene is a change of fidelity, not a change of layout.
    loading: () => <ScalePoster />,
  },
);

export function Hero() {
  const { scrollTo } = useMotion();

  return (
    <section
      data-scroll-section="hero"
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-void pb-16 pt-28 sm:pb-20 lg:min-h-screen lg:justify-center lg:pb-0 lg:pt-0"
    >
      {/* --- The scene ------------------------------------------------- */}
      <div
        className="vignette absolute inset-0 -z-10"
        aria-hidden="true"
        data-webgl-surface
        data-webgl-label="Explore"
      >
        <HeroCanvas />
      </div>

      {/* Directional scrim: heaviest behind the copy, clear over the subject. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-r from-void/92 via-void/45 to-transparent lg:from-void/88 lg:via-void/25"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-linear-to-t from-void to-transparent"
      />

      {/* --- The copy -------------------------------------------------- */}
      <div className="shell relative w-full" data-cursor-normal>
        <div className="max-w-2xl">
          <p className="label mb-7 will-reveal">Precision in Every Gram</p>

          <h1
            id="hero-heading"
            className="font-display text-hero font-normal text-ivory will-reveal"
          >
            <span className="block">Where Gold Finds</span>
            <span className="gold-leaf block italic">Its True Weight.</span>
          </h1>

          <p className="mt-8 max-w-xl text-lead text-ivory/72 will-reveal">
            Private gold evaluation and exchange, guided by precision, transparency and trusted
            expertise.
          </p>

          <div className="mt-11 flex flex-col items-start gap-4 will-reveal sm:flex-row sm:items-center sm:gap-7">
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

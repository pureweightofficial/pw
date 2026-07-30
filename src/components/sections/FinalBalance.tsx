'use client';

import dynamic from 'next/dynamic';
import { VisitCta } from '@/components/ui/VisitCta';
import { ScalePoster } from '@/components/webgl/ScalePoster';

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
  () => import('@/components/webgl/canvases').then((m) => m.FinaleCanvas),
  { ssr: false, loading: () => <ScalePoster /> },
);

export function FinalBalance() {
  return (
    <section
      id="finale"
      data-scroll-section="finale"
      aria-labelledby="finale-heading"
      className="relative isolate flex min-h-[92svh] items-center overflow-hidden bg-void py-24 lg:min-h-screen"
    >
      <div className="vignette absolute inset-0 -z-10" aria-hidden="true" data-webgl-surface>
        <FinaleCanvas />
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-t from-void via-void/62 to-void/35"
      />

      <div className="shell relative w-full" data-cursor-normal>
        <div className="mx-auto max-w-3xl text-center">
          <p className="label mb-8 will-reveal">In Balance</p>

          <h2
            id="finale-heading"
            className="font-display text-chapter font-normal text-ivory will-reveal"
          >
            Know the true value
            <br />
            <span className="gold-leaf accent-italic">of what you hold.</span>
          </h2>

          <p className="mx-auto mt-8 max-w-lg text-lead text-ivory/72 will-reveal">
            Bring your items in. We will examine and weigh them with you, and explain every
            figure before you decide.
          </p>

          <div className="mt-12 flex justify-center will-reveal">
            <VisitCta />
          </div>
        </div>
      </div>
    </section>
  );
}

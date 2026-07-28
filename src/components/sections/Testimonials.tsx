'use client';

import { useState } from 'react';
import { Eyebrow, Section } from '@/components/ui/primitives';

/**
 * TESTIMONIALS
 *
 * Deliberately empty of content.
 *
 * Writing three plausible customer quotes here would take a minute and would be
 * fabricated evidence about a real business — the single most damaging thing
 * this page could carry. So the component ships complete: the typography, the
 * one-at-a-time presentation, the manual controls, the screen-reader
 * announcements — with slots where the approved quotes go.
 *
 * Manual controls only. No auto-rotation anywhere, and specifically not on
 * mobile: a testimonial that moves while it is being read is a testimonial that
 * does not get read.
 */

/** Replace with client-approved testimonials. Keep the shape. */
const testimonials: { quote: string; name: string; context: string }[] = [];

const SLOT_COUNT = 3;

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const total = testimonials.length || SLOT_COUNT;
  const current = testimonials[index];

  const go = (next: number) => setIndex((next + total) % total);

  return (
    <Section
      id="testimonials"
      material="glass"
      labelledBy="testimonials-heading"
      className="py-24 lg:py-36"
    >
      <div className="shell-narrow text-center">
        <Eyebrow className="mb-8 will-reveal">In Their Words</Eyebrow>

        <h2 id="testimonials-heading" className="sr-only">
          Customer testimonials
        </h2>

        <div className="min-h-[16rem]" aria-live="polite" aria-atomic="true">
          {current ? (
            <blockquote className="will-reveal">
              <p className="font-display text-statement font-normal leading-tight text-ivory italic">
                &ldquo;{current.quote}&rdquo;
              </p>
              <footer className="mt-9">
                <p className="text-[0.74rem] font-medium tracking-[0.2em] text-gold-antique uppercase">
                  {current.name}
                </p>
                <p className="mt-2 text-xs tracking-[0.1em] text-ash">{current.context}</p>
              </footer>
            </blockquote>
          ) : (
            <div className="will-reveal">
              <p className="mx-auto max-w-2xl font-display text-statement font-normal leading-tight text-ash italic">
                &ldquo;&nbsp;&nbsp;&nbsp;&rdquo;
              </p>
              <p className="mx-auto mt-8 inline-flex items-center gap-2 border border-dashed border-gold-antique/35 bg-gold-antique/5 px-4 py-2 text-[0.66rem] tracking-[0.16em] text-gold-antique uppercase">
                <span aria-hidden="true">◇</span>
                Genuine client testimonial required
              </p>
              <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ash">
                No testimonials are shown because none have been supplied and approved. This section
                will display them exactly as written, with the customer&apos;s name and context, once
                the client provides them.
              </p>
            </div>
          )}
        </div>

        {/* Controls. Present and functional even while the slots are empty, so
            the interaction can be reviewed and tested before content lands. */}
        <div className="mt-12 flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={testimonials.length === 0}
            className="flex h-11 w-11 items-center justify-center border border-gold-antique/28 text-gold-antique transition-colors duration-300 enabled:hover:border-gold-rich enabled:hover:text-gold-high disabled:opacity-30"
          >
            <span className="sr-only">Previous testimonial</span>
            <span aria-hidden="true">←</span>
          </button>

          <p className="text-[0.62rem] tracking-[0.24em] text-ash uppercase tabular-nums">
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </p>

          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={testimonials.length === 0}
            className="flex h-11 w-11 items-center justify-center border border-gold-antique/28 text-gold-antique transition-colors duration-300 enabled:hover:border-gold-rich enabled:hover:text-gold-high disabled:opacity-30"
          >
            <span className="sr-only">Next testimonial</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </Section>
  );
}

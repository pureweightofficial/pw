'use client';

import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PWEmblem } from '@/components/brand/Marks';

/**
 * THE OPENING
 *
 * A gold line traces the emblem out of black, the balance resolves, the
 * wordmark strikes in, and the curtain lifts. Roughly 2.6 seconds.
 *
 * Four rules keep it from becoming the thing everyone hates about luxury sites:
 *
 *  - ONCE PER SESSION. Stored in sessionStorage, so navigating back to the
 *    homepage does not make anyone sit through it twice.
 *  - ALWAYS SKIPPABLE. A visible control, plus Escape, plus any click. The skip
 *    is focused on mount, so a keyboard visitor's first Tab is already on it.
 *  - HONEST PROGRESS. The counter tracks real font and document readiness. It
 *    holds at 96% if the page genuinely is not ready rather than lying its way
 *    to 100 and then stalling on a black screen.
 *  - REDUCED MOTION SKIPS IT ENTIRELY. Not a shortened version — none at all.
 *
 * The page beneath is fully rendered the whole time. This is a curtain, not a
 * gate: if the JS for it never runs, nothing is lost.
 */

const SESSION_KEY = 'pw:loader:v1';

export function Loader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const emblemRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // `null` = undecided. Nothing renders until we know, which avoids both a
  // hydration mismatch and a flash of the loader for repeat visitors.
  const [visible, setVisible] = useState<boolean | null>(null);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      // Private mode with storage disabled: treat as unseen, show it once.
    }

    setVisible(!seen && !reduced);
  }, []);

  const dismiss = useCallback(() => {
    const root = rootRef.current;
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* storage unavailable — the loader simply shows again next session */
    }

    timelineRef.current?.kill();

    if (!root) {
      setVisible(false);
      return;
    }

    gsap
      .timeline({ onComplete: () => setVisible(false) })
      .to(emblemRef.current, { opacity: 0, scale: 1.04, duration: 0.5, ease: 'power2.inOut' })
      .to(root, { yPercent: -100, duration: 0.95, ease: 'power3.inOut' }, '-=0.2');
  }, []);

  useEffect(() => {
    if (visible !== true) return;

    const root = rootRef.current;
    if (!root) return;

    skipRef.current?.focus();

    const ctx = gsap.context(() => {
      // Measure every stroke so the trace draws at a consistent rate rather
      // than each path taking the same time regardless of its length.
      const strokes = gsap.utils.toArray<SVGPathElement | SVGCircleElement>(
        '.pw-trace, .pw-glyph path, .pw-glyph circle',
      );

      strokes.forEach((el) => {
        const length = typeof el.getTotalLength === 'function' ? el.getTotalLength() : 100;
        gsap.set(el, { strokeDasharray: length, strokeDashoffset: length, opacity: 1 });
      });

      gsap.set('.pw-glyph [fill]:not([fill="none"])', { fillOpacity: 0 });
      gsap.set('.pw-loader-text', { opacity: 0, y: 14, filter: 'blur(6px)' });

      const tl = gsap.timeline();
      timelineRef.current = tl;

      tl.to('.pw-trace-outer', { strokeDashoffset: 0, duration: 1.35, ease: 'power2.inOut' })
        .to(
          '.pw-trace-inner',
          { strokeDashoffset: 0, duration: 1.0, ease: 'power2.inOut' },
          '-=1.05',
        )
        // The instrument emerges from the darkness, stroke by stroke.
        .to(
          '.pw-glyph path, .pw-glyph circle',
          { strokeDashoffset: 0, duration: 0.9, ease: 'power2.out', stagger: 0.045 },
          '-=0.9',
        )
        // Then the metal fills in behind the lines.
        .to(
          '.pw-glyph [fill]:not([fill="none"])',
          { fillOpacity: 1, duration: 0.7, ease: 'power2.out', stagger: 0.02 },
          '-=0.35',
        )
        .to(
          '.pw-loader-text',
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.85, ease: 'power3.out' },
          '-=0.5',
        );
    }, root);

    /* ---------------------------------------------------------------- */
    /* PROGRESS                                                          */
    /* ---------------------------------------------------------------- */

    const started = performance.now();
    const MIN_MS = 2400;
    let ready = false;
    let raf = 0;

    const readiness = Promise.allSettled([
      document.fonts?.ready ?? Promise.resolve(),
      document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true })),
    ]);

    readiness.then(() => {
      ready = true;
    });

    const tick = () => {
      const elapsed = performance.now() - started;
      const timed = Math.min(1, elapsed / MIN_MS);

      // Ease toward 96 on the timer, and only cross it once the page really is
      // ready. A counter that hits 100 and then waits is worse than no counter.
      const value = ready ? Math.min(100, timed * 100) : Math.min(96, timed * 96);
      setPercent(Math.round(value));

      if (value >= 100) {
        dismiss();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    /* ---------------------------------------------------------------- */
    /* ESCAPE HATCHES                                                    */
    /* ---------------------------------------------------------------- */

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') dismiss();
    };

    // Absolute ceiling. If anything above goes wrong, the curtain still lifts.
    const failsafe = window.setTimeout(dismiss, 6000);

    window.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
      window.removeEventListener('keydown', onKey);
      ctx.revert();
      timelineRef.current = null;
    };
  }, [visible, dismiss]);

  if (visible !== true) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-void grain"
      role="status"
      aria-live="polite"
      aria-label="Loading Pureweight Gold Exchange"
      onClick={dismiss}
    >
      <div ref={emblemRef} className="flex flex-col items-center px-6">
        <PWEmblem uid="pw-loader" traceable className="w-[clamp(140px,26vw,220px)]" />

        <div className="pw-loader-text mt-10 flex flex-col items-center gap-3">
          <p className="label text-[0.62rem] tracking-[0.42em] text-gold-antique">
            Establishing True Value
          </p>
          <div className="flex items-baseline gap-3">
            <span
              className="font-display text-3xl text-gold-pale tabular-nums"
              aria-hidden="true"
            >
              {String(percent).padStart(3, '0')}
            </span>
            <span className="text-[0.6rem] tracking-[0.3em] text-ash uppercase">per cent</span>
          </div>
        </div>
      </div>

      {/* A hairline that levels as loading completes — the balance motif, in its
          smallest possible form. */}
      <div className="absolute bottom-0 left-0 h-px w-full bg-bronze/30">
        <div
          className="h-full bg-linear-to-r from-gold-antique/40 via-gold-high to-gold-antique/40 transition-[width] duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <button
        ref={skipRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        className="absolute bottom-8 right-6 text-[0.62rem] tracking-[0.28em] text-ash uppercase transition-colors duration-300 hover:text-gold-high sm:right-10"
      >
        Skip
      </button>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Eyebrow, Section } from '@/components/ui/primitives';
import { scrollState } from '@/lib/scroll-store';
import { journey } from '@/lib/site';

/**
 * THE VALUATION JOURNEY
 *
 * Four stages, and the section where the site's central idea does its work:
 * `scrollState.balance` runs 0 -> 1 across exactly this range, so the 3D
 * instrument in the hero comes level precisely as the visitor finishes reading
 * "Complete the Exchange". The concept is not decoration bolted onto the
 * process — the process *is* the animation's timeline.
 *
 * The needle on the left is that same value, rendered as a graduated arc. It is
 * marked `aria-hidden` and paired with a real ordered list, so the sequence is
 * conveyed by document structure and not by the indicator.
 *
 * Not pinned. Pinning four stages would trap the scroll for several screens on
 * mobile and is exactly the kind of "immersive" that makes a site tiring.
 */

export function ValuationJourney() {
  return (
    <Section
      id="journey"
      scrollSection="journey"
      material="stone"
      labelledBy="journey-heading"
      className="py-24 lg:py-36"
    >
      <div className="shell">
        <div className="max-w-3xl">
          <Eyebrow className="mb-8 will-reveal">Chapter 02 — The Process</Eyebrow>
          <h2
            id="journey-heading"
            className="font-display text-chapter font-normal text-ivory will-reveal"
          >
            From Weight to <span className="accent-italic text-gold-high/90">True Value</span>
          </h2>
          <p className="mt-7 max-w-xl text-lead text-ash will-reveal">
            Four stages, in order, with nothing agreed until the last one. Each stage produces a
            fact that the next stage depends on.
          </p>
        </div>

        <div className="mt-20 grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* --- The needle ------------------------------------------- */}
          <div className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-32">
              <BalanceIndicator />
            </div>
          </div>

          {/* --- The stages ------------------------------------------- */}
          <ol className="lg:col-span-8">
            {journey.map((stage, index) => (
              <li
                key={stage.step}
                data-journey-stage={index}
                className="group border-t border-gold-antique/18 py-12 first:border-t-0 first:pt-0 lg:py-16"
              >
                <div className="will-reveal">
                  <div className="flex items-baseline gap-6">
                    <span className="font-display text-5xl font-normal text-gold-antique/75 transition-colors duration-700 group-hover:text-gold-antique lg:text-6xl">
                      {stage.step}
                    </span>
                    <h3 className="font-display text-3xl font-normal tracking-tight text-ivory lg:text-4xl">
                      {stage.title}
                    </h3>
                  </div>

                  <p className="mt-6 max-w-xl text-lead text-ivory/72">{stage.body}</p>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-ash">{stage.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}

/**
 * The graduated arc and needle.
 *
 * Reads `scrollState.balance` directly — the same value that drives the 3D beam
 * and every hairline rule on the page. One source of truth, three surfaces
 * expressing it.
 *
 * The needle transform is written straight to the DOM node inside the animation
 * frame; only the coarse "Establishing / In Balance" label goes through React
 * state, and only when it actually flips. A `setState` per frame here would
 * re-render this subtree sixty times a second for a value no other component
 * reads.
 */
function BalanceIndicator() {
  const needleRef = useRef<SVGGElement>(null);
  const [level, setLevel] = useState(false);

  useEffect(() => {
    let raf = 0;
    let lastLevel = false;

    const tick = () => {
      // -2.6deg of beam tilt maps to the full sweep of the needle.
      const tilt = -2.6 * (1 - scrollState.balance);
      const needle = (tilt / 2.6) * 14;

      if (needleRef.current) {
        needleRef.current.style.transform = `rotate(${needle.toFixed(3)}deg)`;
      }

      const isLevel = scrollState.balance > 0.985;
      if (isLevel !== lastLevel) {
        lastLevel = isLevel;
        setLevel(isLevel);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const ticks = Array.from({ length: 15 }, (_, i) => {
    const t = (i - 7) / 7;
    const angle = -Math.PI / 2 + t * 0.62;
    const major = i % 7 === 0;
    const inner = major ? 76 : 84;
    const outer = 92;

    return {
      key: i,
      major,
      x1: 130 + Math.cos(angle) * inner,
      y1: 150 + Math.sin(angle) * inner,
      x2: 130 + Math.cos(angle) * outer,
      y2: 150 + Math.sin(angle) * outer,
    };
  });

  return (
    <div aria-hidden="true" className="flex flex-col items-center">
      <svg viewBox="0 0 260 190" className="w-full max-w-[260px]">
        <defs>
          <linearGradient id="needle-gold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffe9a8" />
            <stop offset="60%" stopColor="#d7a83d" />
            <stop offset="100%" stopColor="#7a5414" />
          </linearGradient>
        </defs>

        <path
          d="M 38 150 A 92 92 0 0 1 222 150"
          fill="none"
          stroke="#b98220"
          strokeOpacity="0.28"
          strokeWidth="1.2"
        />

        {ticks.map((tick) => (
          <line
            key={tick.key}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.major ? '#ffe9a8' : '#d7a83d'}
            strokeOpacity={tick.major ? 0.85 : 0.4}
            strokeWidth={tick.major ? 2 : 1.1}
          />
        ))}

        {/* Struck zero mark, heavier than the graduations around it. */}
        <line x1="130" y1="52" x2="130" y2="74" stroke="#fff6df" strokeWidth="2.6" />

        <g
          ref={needleRef}
          style={{ transformOrigin: '130px 150px', transform: 'rotate(-14deg)' }}
        >
          <path d="M 127.4 150 L 132.6 150 L 131 66 L 129 66 Z" fill="url(#needle-gold)" />
        </g>

        <circle cx="130" cy="150" r="7" fill="#1a1714" stroke="#b98220" strokeWidth="1.4" />
        <circle cx="130" cy="150" r="2.4" fill="#d7a83d" />
      </svg>

      <p
        className={`mt-6 text-[0.6rem] tracking-[0.3em] uppercase transition-colors duration-700 ${
          level ? 'text-gold-high' : 'text-ash'
        }`}
      >
        {level ? 'In Balance' : 'Establishing'}
      </p>
    </div>
  );
}

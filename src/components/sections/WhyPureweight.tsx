"use client";

import { Eyebrow, Section } from "@/components/ui/primitives";
import { pillars } from "@/lib/site";
import { AmbientGlow } from "@/components/ui/AmbientGlow";
import { SectionScene } from "@/components/ui/SectionScene";

/**
 * WHY PUREWEIGHT
 *
 * The pillars, presented as engraved medallions rather than icon cards. The
 * medallion geometry is lifted directly from the emblem — beaded outer ring,
 * hairline inner rule, cardinal lozenges — so these read as struck from the same
 * die as the logo rather than as generic circles.
 *
 * THE COUNT IS DATA-DRIVEN, INCLUDING THE INTERIOR MARKS. The marks used to be
 * selected by three hardcoded `index === n` tests, so when the pillars went from
 * three to four the fourth medallion rendered as an empty beaded circle — a
 * silent visual gap that typechecked, linted and built perfectly. They are now
 * an indexed table read modulo its own length, so no pillar count can produce a
 * blank face again.
 *
 * The "slow light pass" the brief asked for is a single sweep across the
 * medallion on hover, plus the reveal-on-enter. It does not loop. A gold sheen
 * cycling forever on three circles is precisely the kind of restless ornament
 * that makes an expensive site look cheap.
 */

export function WhyPureweight() {
  return (
    <Section
      id="pillars"
      material="stone"
      labelledBy="pillars-heading"
      className="py-24 lg:py-40"
    >
      <SectionScene variant="seal" />
      <AmbientGlow intensity="normal" placement="split" />
      <div className="shell">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow align="center" className="mb-8 will-reveal">
            Chapter 05 — Built on Trust
          </Eyebrow>
          <h2
            id="pillars-heading"
            className="font-display text-chapter font-normal text-ivory will-reveal"
          >
            {/* Not "three things" any more — the heading used to hardcode the count
                and would have silently gone wrong when the pillars became four. */}
            What you can check
            <span className="accent-italic text-gold-high/90">
              {" "}
              for yourself
            </span>
          </h2>
        </div>

        {/* 2 x 2 on tablet, 4 across on desktop. Was md:grid-cols-3, which left a
            lone orphan on the second row once the pillars went from three to four. */}
        <div className="mt-20 grid gap-16 sm:grid-cols-2 sm:gap-10 lg:mt-28 lg:grid-cols-4 lg:gap-12">
          {pillars.map((pillar, index) => (
            <article
              key={pillar.title}
              className="group flex flex-col items-center text-center"
            >
              <div className="will-reveal">
                <Medallion index={index} label={pillar.title} />
              </div>

              <h3 className="mt-9 font-display text-3xl font-normal text-ivory will-reveal lg:text-4xl">
                {pillar.title}
              </h3>

              <p className="mt-5 max-w-xs text-lead text-ash will-reveal">
                {pillar.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}

/**
 * An engraved medallion. The interior mark comes from the MARKS table below —
 * the old comment here named the three original pillars, which no longer exist.
 */
function Medallion({ index, label }: { index: number; label: string }) {
  const uid = `medallion-${index}`;
  // Modulo, so a fifth pillar reuses a mark rather than rendering an empty face.
  const Mark = MARKS[index % MARKS.length];

  return (
    <div className="relative">
      <svg
        viewBox="0 0 200 200"
        className="w-32 lg:w-40"
        role="img"
        aria-label={`${label} emblem`}
      >
        <defs>
          <linearGradient
            id={`${uid}-gold`}
            x1="10%"
            y1="0%"
            x2="90%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#5c3f10" />
            <stop offset="26%" stopColor="#b98220" />
            <stop offset="46%" stopColor="#ffe9a8" />
            <stop offset="66%" stopColor="#d7a83d" />
            <stop offset="100%" stopColor="#4d3515" />
          </linearGradient>
          <radialGradient id={`${uid}-face`} cx="34%" cy="26%" r="76%">
            <stop offset="0%" stopColor="#1a1714" />
            <stop offset="100%" stopColor="#070706" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="94" fill={`url(#${uid}-face)`} />
        <circle
          cx="100"
          cy="100"
          r="94"
          fill="none"
          stroke={`url(#${uid}-gold)`}
          strokeWidth="1.3"
        />
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke={`url(#${uid}-gold)`}
          strokeWidth="0.7"
          opacity="0.55"
        />

        {/* Beading, from the emblem's frame. */}
        <g fill={`url(#${uid}-gold)`} opacity="0.8">
          {Array.from({ length: 44 }, (_, i) => {
            const a = (i / 44) * Math.PI * 2 - Math.PI / 2;
            return (
              <circle
                key={i}
                cx={100 + Math.cos(a) * 87}
                cy={100 + Math.sin(a) * 87}
                r={i % 4 === 0 ? 1.9 : 1}
              />
            );
          })}
        </g>

        <Mark uid={uid} />
      </svg>

      {/* The light pass. One sweep on hover, then done. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
      >
        <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-gold-pale/18 to-transparent transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-full" />
      </span>
    </div>
  );
}

/**
 * The interior marks, in pillar order.
 *
 *   0  weighed in front of you       the balance beam itself, level and open
 *   1  measured against the market   a graduated dial reading true
 *   2  the working is shown          the struck monogram
 *   3  no obligation, ever           a return arrow — your items come back
 *
 * Read modulo its length by Medallion, so the array can be shorter than the
 * pillar list without producing a blank medallion.
 */
const MARKS = [TransparencyMark, PrecisionMark, TrustMark, ReturnMark] as const;

/** NO OBLIGATION — a return arrow. What you brought in goes back out with you. */
function ReturnMark({ uid }: { uid: string }) {
  return (
    <g stroke={`url(#${uid}-gold)`} fill="none" strokeLinecap="round">
      {/* An open arc rather than a closed ring: nothing here binds. */}
      <path d="M 138 100 A 38 38 0 1 1 100 62" strokeWidth="2.4" />
      {/* The head, turned back on itself. */}
      <path d="M 100 62 L 112 54 M 100 62 L 110 74" strokeWidth="2.4" />
      {/* An open palm line beneath, and the hairline the other marks all carry. */}
      <path
        d="M 74 128 A 26 12 0 0 0 126 128"
        strokeWidth="1.6"
        strokeOpacity="0.7"
      />
      <line
        x1="70"
        y1="142"
        x2="130"
        y2="142"
        strokeWidth="1"
        strokeOpacity="0.4"
      />
    </g>
  );
}

/** PRECISION — a graduated cross-hair reading true. */
function PrecisionMark({ uid }: { uid: string }) {
  return (
    <g stroke={`url(#${uid}-gold)`} fill="none">
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const major = i % 6 === 0;
        return (
          <line
            key={i}
            x1={100 + Math.cos(a) * (major ? 44 : 52)}
            y1={100 + Math.sin(a) * (major ? 44 : 52)}
            x2={100 + Math.cos(a) * 60}
            y2={100 + Math.sin(a) * 60}
            strokeWidth={major ? 2.2 : 1}
            strokeOpacity={major ? 0.95 : 0.45}
          />
        );
      })}
      <circle cx="100" cy="100" r="10" strokeWidth="1.6" strokeOpacity="0.9" />
      <circle
        cx="100"
        cy="100"
        r="2.6"
        fill={`url(#${uid}-gold)`}
        stroke="none"
      />
    </g>
  );
}

/** TRANSPARENCY — an open beam, level, nothing concealed beneath it. */
function TransparencyMark({ uid }: { uid: string }) {
  return (
    <g stroke={`url(#${uid}-gold)`} fill="none" strokeLinecap="round">
      <line x1="46" y1="92" x2="154" y2="92" strokeWidth="2.4" />
      <path
        d="M 94 94 L 100 106 L 106 94 Z"
        fill={`url(#${uid}-gold)`}
        stroke="none"
      />
      <line
        x1="46"
        y1="92"
        x2="46"
        y2="118"
        strokeWidth="1.2"
        strokeOpacity="0.6"
      />
      <line
        x1="154"
        y1="92"
        x2="154"
        y2="118"
        strokeWidth="1.2"
        strokeOpacity="0.6"
      />
      <path d="M 32 118 A 14 9 0 0 0 60 118 Z" strokeWidth="1.6" />
      <path d="M 140 118 A 14 9 0 0 0 168 118 Z" strokeWidth="1.6" />
      <line x1="100" y1="70" x2="100" y2="92" strokeWidth="1.8" />
      <line
        x1="70"
        y1="134"
        x2="130"
        y2="134"
        strokeWidth="1"
        strokeOpacity="0.4"
      />
    </g>
  );
}

/** TRUST — the monogram, struck into the face. */
function TrustMark({ uid }: { uid: string }) {
  return (
    <g>
      <text
        x="100"
        y="116"
        textAnchor="middle"
        fontSize="56"
        fill={`url(#${uid}-gold)`}
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        PW
      </text>
      <line
        x1="66"
        y1="132"
        x2="134"
        y2="132"
        stroke={`url(#${uid}-gold)`}
        strokeWidth="1.1"
        strokeOpacity="0.7"
      />
      <path
        d="M 96 133 L 100 140 L 104 133 Z"
        fill={`url(#${uid}-gold)`}
        opacity="0.75"
      />
    </g>
  );
}

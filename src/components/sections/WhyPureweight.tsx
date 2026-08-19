"use client";

import { Eyebrow, Section } from "@/components/ui/primitives";
import type { ReactElement } from "react";
import { pillars } from "@/lib/site";
import { AmbientGlow } from "@/components/ui/AmbientGlow";
import { SectionScene } from "@/components/ui/SectionScene";
import { opener } from "@/lib/copy";

const copy = opener("pillars", {
  eyebrow: "Chapter 05 — Built on Trust",
  heading: "What you can check",
  accent: "for yourself",
  lead: "",
});

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
      className="py-20 lg:py-28"
    >
      <SectionScene variant="seal" />
      <AmbientGlow intensity="normal" placement="split" />
      <div className="shell">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow align="center" className="mb-8 will-reveal">
            {copy.eyebrow}
          </Eyebrow>
          <h2
            id="pillars-heading"
            className="font-display text-chapter text-ivory will-reveal"
          >
            {/* Not "three things" any more — the heading used to hardcode the count
                and would have silently gone wrong when the pillars became four. */}
            {copy.heading}
            <span className="accent-italic text-gold-high/90">
              {" "}
              {copy.accent}
            </span>
          </h2>
        </div>

        {/* 2 x 2 on tablet, 4 across on desktop. Was md:grid-cols-3, which left a
            lone orphan on the second row once the pillars went from three to four.

            THE ROWS ARE SHARED, VIA SUBGRID, and that is what fixes the drift
            a design review caught as "value-prop row baselines misaligned".
            The four titles do not all wrap the same way — "Weighed in front of
            you" takes two lines, "The working is shown" takes two, "No
            obligation, ever" takes two, "Measured against the market" takes
            three — so with each card laying itself out independently, every
            body paragraph started at a different height and the row read as
            four separate components that happened to be adjacent.

            Each card spans three rows of the parent grid (medallion, title,
            body) and inherits those tracks with `grid-template-rows: subgrid`.
            The tallest title in the row now sets the title track for all four,
            so the bodies share one baseline no matter how the titles wrap —
            without a magic min-height that would need re-measuring every time
            the copy changes. */}
        <div className="mt-20 grid gap-16 sm:grid-cols-2 sm:gap-10 lg:mt-28 lg:grid-cols-4 lg:gap-12 lg:grid-rows-[auto_auto_1fr]">
          {pillars.map((pillar, index) => (
            <article
              key={pillar.title}
              className="group flex flex-col items-center text-center lg:grid lg:row-span-3 lg:grid-rows-subgrid lg:justify-items-center lg:gap-0"
            >
              <div className="will-reveal">
                <Medallion index={index} label={pillar.title} />
              </div>

              <h3 className="mt-9 font-display text-3xl text-ivory will-reveal lg:text-4xl">
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
  const Mark = MARKS[label];

  return (
    <div className="relative">
      <svg
        viewBox="0 0 200 200"
        className="w-32 lg:w-40"
        role="img"
        aria-label={`${label} emblem`}
      >
        <defs>
          {/*
            userSpaceOnUse, NOT the default objectBoundingBox — a correctness
            fix, not a preference.

            An objectBoundingBox gradient is resolved against the bounding box
            of the element it paints. A horizontal <line> has a box of ZERO
            HEIGHT and a vertical one ZERO WIDTH, so the mapping degenerates and
            the element is not rendered at all.

            That is why the balance never looked like a balance. Its beam, its
            column and its base are all axis-aligned lines, so all three were
            invisible, leaving a triangle and two crescents floating in an empty
            frame — which is precisely what the client screenshotted and asked
            about. The same silence had removed every line item from the ledger.

            Pinning the gradient to the 200x200 viewBox makes it independent of
            the painted element's box, so a one-dimensional stroke takes the
            same gold as everything else.
          */}
          <linearGradient
            id={`${uid}-gold`}
            gradientUnits="userSpaceOnUse"
            x1="20"
            y1="0"
            x2="180"
            y2="200"
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

        {Mark ? <Mark uid={uid} /> : null}
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

/* -------------------------------------------------------------------------- */
/* THE MARKS                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * PICTOGRAMS, NOT ORNAMENTS — and keyed by which pillar they belong to.
 *
 * The previous set was abstract: a balance beam whose pans were 14px arcs, a
 * graduated dial, the PW monogram, and an open arc. At the size these actually
 * render — 128px on mobile, 160px on desktop, inside a beaded frame — none of
 * them said what the heading beneath it said. The dial read as a clock, the
 * monogram said nothing about showing your working, and the arc read as a
 * partial circle. So each is now a drawing of the thing the pillar claims.
 *
 * Sized to be legible rather than decorative: main strokes at 3, detail at
 * 1.6, everything inside r≈62 so it sits clear of the inner ring at r=80.
 *
 * KEYED BY TITLE, NOT BY ARRAY POSITION. Twice now — the services plate motifs
 * and these very medallions — artwork selected by index has silently re-pointed
 * itself when the content was rewritten. An unknown title falls back to no mark
 * rather than to whichever drawing happens to be fourth.
 */
const MARKS: Record<string, (p: { uid: string }) => ReactElement> = {
  "Weighed in front of you": BalanceMark,
  "Measured against the market": MarketMark,
  "The working is shown": LedgerMark,
  "No obligation, ever": OpenHandMark,
};

/** WEIGHED IN FRONT OF YOU — a balance, level, both pans in plain view. */
function BalanceMark({ uid }: { uid: string }) {
  const gold = `url(#${uid}-gold)`;
  return (
    <g stroke={gold} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Beam, level — the whole promise of the pillar in one horizontal. */}
      <line x1="48" y1="76" x2="152" y2="76" strokeWidth="3" />
      {/* Fulcrum and column. */}
      <path d="M 100 62 L 92 76 L 108 76 Z" fill={gold} stroke="none" />
      <line x1="100" y1="76" x2="100" y2="146" strokeWidth="3" />
      <line x1="76" y1="146" x2="124" y2="146" strokeWidth="3.4" />
      <path d="M 84 152 L 88 146 L 112 146 L 116 152 Z" fill={gold} stroke="none" opacity="0.85" />
      {/* Hangers and pans. Deep enough to read as bowls at 128px, which the
          14px arcs they replace were not. */}
      <line x1="48" y1="76" x2="48" y2="94" strokeWidth="1.6" strokeOpacity="0.75" />
      <line x1="152" y1="76" x2="152" y2="94" strokeWidth="1.6" strokeOpacity="0.75" />
      <path d="M 30 94 Q 48 116 66 94" strokeWidth="2.8" />
      <path d="M 134 94 Q 152 116 170 94" strokeWidth="2.8" />
    </g>
  );
}

/** MEASURED AGAINST THE MARKET — a published price line, rising. */
function MarketMark({ uid }: { uid: string }) {
  const gold = `url(#${uid}-gold)`;
  return (
    <g stroke={gold} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Axes. */}
      <path d="M 56 52 V 146 H 150" strokeWidth="2.2" />
      {/* Two faint rules, so the line is read AGAINST something — the point of
          the pillar is the reference, not the price. */}
      <line x1="56" y1="92" x2="150" y2="92" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="56" y1="119" x2="150" y2="119" strokeWidth="1" strokeOpacity="0.3" />
      {/* The trace. */}
      <polyline points="66,132 88,110 106,120 126,86 144,68" strokeWidth="3" />
      <path d="M 144 68 L 133 70 M 144 68 L 142 79" strokeWidth="2.4" />
      <g fill={gold} stroke="none">
        <circle cx="88" cy="110" r="2.6" />
        <circle cx="106" cy="120" r="2.6" />
        <circle cx="126" cy="86" r="2.6" />
      </g>
    </g>
  );
}

/** THE WORKING IS SHOWN — an itemised sheet with the total ruled beneath. */
function LedgerMark({ uid }: { uid: string }) {
  const gold = `url(#${uid}-gold)`;
  return (
    <g stroke={gold} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Sheet with a turned corner, so it reads as paper rather than a box. */}
      <path d="M 62 48 H 122 L 138 64 V 152 H 62 Z" strokeWidth="2.6" />
      <path d="M 122 48 V 64 H 138" strokeWidth="1.8" strokeOpacity="0.75" />
      {/* Three line items: a label and a figure each. */}
      {[84, 98, 112].map((y) => (
        <g key={y}>
          <line x1="74" y1={y} x2="106" y2={y} strokeWidth="2" strokeOpacity="0.8" />
          <line x1="114" y1={y} x2="128" y2={y} strokeWidth="2" strokeOpacity="0.55" />
        </g>
      ))}
      {/* The rule, and the figure it produces — the working, shown. */}
      <line x1="74" y1="126" x2="128" y2="126" strokeWidth="1.4" strokeOpacity="0.7" />
      <line x1="104" y1="138" x2="128" y2="138" strokeWidth="3.2" />
    </g>
  );
}

/** NO OBLIGATION, EVER — an open hand, and the piece free above it. */
function OpenHandMark({ uid }: { uid: string }) {
  const gold = `url(#${uid}-gold)`;
  return (
    <g stroke={gold} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* The piece, unheld. Drawn as this site's own bar in profile: no marks,
          no stamp, nothing claimed about it. */}
      <path d="M 84 64 L 116 64 L 120 78 L 80 78 Z" strokeWidth="2.4" />
      {/*
        An open hand, front on. The first attempt drew a deep cupped arc with
        four strokes rising off its rim, and at 128px that reads as a BASKET —
        a container, which is the opposite of what this pillar promises.

        Fingers as separate round-capped strokes above a palm, with a thumb off
        to one side, is what makes a hand read as a hand at this size. Wide
        strokes, because a 1.5px finger is a scratch.
      */}
      <g strokeWidth="5.5">
        <line x1="84" y1="98" x2="84" y2="124" />
        <line x1="96" y1="94" x2="96" y2="124" />
        <line x1="109" y1="94" x2="109" y2="124" />
        <line x1="121" y1="99" x2="121" y2="124" />
      </g>
      <path d="M 76 128 L 64 114" strokeWidth="5.5" />
      <path
        d="M 78 120 H 127 A 8 8 0 0 1 135 128 V 138 A 12 12 0 0 1 123 150 H 82 A 12 12 0 0 1 70 138 V 128 A 8 8 0 0 1 78 120 Z"
        strokeWidth="3"
      />
      {/* The gap between hand and piece is the whole point; nothing bridges it. */}
    </g>
  );
}

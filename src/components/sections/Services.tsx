import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { assetPath } from "@/lib/asset";
import { BeamDivider, Eyebrow, Section } from "@/components/ui/primitives";
import { services } from "@/lib/site";
import { AmbientGlow } from "@/components/ui/AmbientGlow";
import { SectionScene } from "@/components/ui/SectionScene";

/**
 * SERVICES
 *
 * Large alternating editorial panels rather than a grid of six identical cards.
 * A grid flattens four quite different propositions into one visual weight; the
 * alternating layout lets each one have a full spread and its own rhythm.
 *
 * ON THE IMAGERY: two of the four panels carry photography — Gold Jewellery and
 * Coins. Each is desaturated and warmed by a gold overlay so a stock photograph
 * sits inside the brand's light rather than next to it; untreated stock is the
 * fastest way to break a bespoke palette.
 *
 * Silver and Bars & Bullion keep the engraved plate, and both are decisions
 * rather than gaps. Bullion's photograph was REMOVED: it showed another refiner's
 * trademark, its crest, "1 KILO / 999.9 FINE GOLD" and three bar serial numbers,
 * and no crop cleared them. Silver has no photograph because two rounds through
 * the CC0 pool produced WPA watercolours, a costume bangle on white, and a museum
 * shot with the colour calibration card still in frame. A plate beats all of
 * those. public/img/CREDITS.md has the full record and what would unlock them.
 *
 * The four categories are now `confirmed: true` — the client confirmed they buy
 * gold and silver jewellery, coins and bullion — so the pending markers no longer
 * render. They remain wired up for anything added later that is not yet agreed.
 */

export function Services() {
  return (
    <Section
      id="services"
      material="steel"
      labelledBy="services-heading"
      /*
        Bottom padding only. The top padding — and the gap down to the first
        panel — live INSIDE the opener band below, so the bar's canvas covers
        the whole void the client marked, not just the strip the text happens
        to occupy. With the padding outside the band, the canvas was ~290px
        tall and the bar rendered as a chip.
      */
      className="pb-24 lg:pb-36"
    >
      <AmbientGlow intensity="soft" placement="left" />
      {/*
        THE CHAPTER OPENER CARRIES THE TURNING GOLD BAR — scoped to this band,
        not the section.

        The client marked the empty right half of this opener and asked for the
        bar the journey section has. The scene is mounted on a wrapper around
        the heading band rather than on the section for two reasons that are
        about cost, not taste:

          - this section is ~4000px tall. A section-level canvas means a
            1440x4000 render target redrawing every frame for one object that
            lives in the top 500px of it.
          - the four panels below carry photography and engraved plates. A lit
            scene moving behind those would be backdrop arguing with content —
            the same reason the evidence ledger and insights index have no
            scene at all.

        `hidden lg:block` because the void itself is a desktop artefact: below
        lg the copy spans the full width and there is nothing empty to fill —
        there would only be a moving bar behind text. A display:none host never
        intersects the viewport, so SceneShell never mounts the canvas and
        phones pay nothing.

        The bar variant's placement is frame-shape-aware (see GoldBar in
        AmbientScene): in this wide band it holds the vertical centre at 78%
        across, clear of the copy, under the same reveal scrim the journey
        column uses — heavy where the words are, open where the bar is.
      */}
      <div className="relative pt-24 pb-20 lg:pt-36 lg:pb-28">
        <SectionScene
          variant="bar"
          scrim="reveal"
          className="hidden lg:block"
        />
        <div className="shell">
          <div className="max-w-3xl">
            {/* Was "Chapter 03 — The Services" against a chapter list and a nav
                that both say "What We Buy". Three labels for one section. */}
            <Eyebrow className="mb-8 will-reveal">
              Chapter 03 — What We Buy
            </Eyebrow>
            <h2
              id="services-heading"
              className="font-display text-chapter font-normal text-ivory will-reveal"
            >
              Gold, silver, coins{" "}
              <span className="accent-italic text-gold-high/90">
                and bullion
              </span>
            </h2>
            <p className="mt-7 max-w-xl text-lead text-ash will-reveal">
              Four categories, one order of operations: weigh it, establish
              what it actually is, show you the working, and only then talk
              about money.
            </p>
          </div>
        </div>
      </div>

      {/* The old mt-20 lg:mt-28 gap is now the opener band's bottom padding,
          so the bar's canvas owns it. */}
      <div>
        {services.map((service, index) => {
          const reversed = index % 2 === 1;

          return (
            <article
              key={service.title}
              className="shell border-t border-gold-antique/16 py-16 first:border-t-0 lg:py-24"
            >
              <div
                className={`grid items-center gap-12 lg:grid-cols-12 lg:gap-20 ${
                  reversed ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                {/* --- Plate --------------------------------------- */}
                <div className="lg:col-span-5">
                  <div
                    className="relative aspect-4/5 w-full overflow-hidden border border-gold-antique/18 bg-void will-reveal"
                    data-parallax="30"
                  >
                    {service.image ? (
                      <>
                        <Image
                          src={assetPath(service.image)}
                          // Describes the photograph, not the heading. Empty alt
                          // was defensible — the heading and bullets carry every
                          // fact — but these are the nearest thing here to product
                          // imagery, and a real description costs nothing in
                          // accessibility terms while being all image search has.
                          alt={service.imageAlt ?? ""}
                          fill
                          sizes="(max-width: 1024px) 100vw, 40vw"
                          className="object-cover"
                          style={{
                            filter:
                              "saturate(0.55) contrast(1.08) brightness(0.72)",
                          }}
                        />
                        {/* Warm the image into the palette and sink its edges
                            into the section, so it reads as lit by the same
                            key light as everything else. */}
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 bg-[linear-gradient(150deg,rgba(184,121,20,0.30),transparent_55%)] mix-blend-overlay"
                        />
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_45%,transparent_10%,rgba(0, 0, 0,0.55)_75%,rgba(0, 0, 0,0.9)_100%)]"
                        />
                      </>
                    ) : (
                      <ServicePlate index={index} title={service.title} />
                    )}
                    <span className="absolute left-5 top-5 font-display text-6xl font-normal text-gold-antique/75">
                      {service.index}
                    </span>
                  </div>
                </div>

                {/* --- Copy ---------------------------------------- */}
                <div className="lg:col-span-7">
                  <div className="will-reveal">
                    {!service.confirmed ? (
                      <p className="mb-5 inline-flex items-center gap-2 border border-dashed border-gold-antique/35 bg-gold-antique/5 px-3 py-1.5 text-[0.62rem] tracking-[0.16em] text-gold-antique uppercase">
                        <span aria-hidden="true">◇</span>
                        Placeholder — pending client confirmation
                      </p>
                    ) : null}

                    <h3 className="font-display text-4xl font-normal text-ivory lg:text-5xl">
                      {service.title}
                    </h3>

                    <p className="mt-5 max-w-xl text-lead text-gold-high/75 accent-italic">
                      {service.summary}
                    </p>

                    <p className="mt-6 max-w-xl text-lead text-ivory/70">
                      {service.body}
                    </p>

                    <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                      {service.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-center gap-2.5 text-[0.72rem] tracking-[0.13em] text-ash uppercase"
                        >
                          <span
                            aria-hidden="true"
                            className="h-px w-5 bg-gold-antique/60"
                          />
                          {point}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={service.enquiryHref}
                      className="group mt-10 inline-flex min-h-11 items-center gap-3 text-[0.7rem] font-medium tracking-[0.24em] text-gold-antique uppercase transition-colors duration-300 hover:text-gold-high"
                    >
                      {service.cta}
                      <span
                        aria-hidden="true"
                        className="block h-px w-8 bg-current transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-14"
                      />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="shell">
        <BeamDivider className="mt-8" />
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* ENGRAVED PLATES                                                            */
/* -------------------------------------------------------------------------- */

/**
 * One engraved motif per service, drawn from the emblem's vocabulary:
 * graduations, stacked bars and concentric bands. Struck rather than drawn —
 * every line has a dark cut and a lit shoulder, so the plate reads as metal
 * under the same key light as everything else.
 *
 * KEYED BY WHAT THE PANEL IS, NOT WHERE IT SITS.
 *
 * These used to be picked with `index === 0 … index === 3`, written when the
 * services were Gold Valuation / Bullion Exchange / Jewellery Evaluation /
 * Private Appointments — which is still what the motif docstrings below say.
 * The services were later rewritten to Jewellery / Silver / Coins / Bars &
 * Bullion, and the positional test silently re-pointed every motif at a panel
 * it was not drawn for.
 *
 * It went unnoticed for three of the four, because those panels carry
 * photographs and never reach the plate at all. The one panel that DOES render
 * a plate — Bars & Bullion — was drawing a vaulted doorway designed for a
 * private-appointments service this business does not offer. That doorway was
 * the only engraved artwork visible anywhere on the site. Meanwhile
 * `BullionMotif`, whose stacked bar edges were drawn for exactly this panel,
 * was pointed at Silver and could never appear.
 *
 * The doorway has been deleted rather than reassigned: its service is gone, and
 * orphaned artwork sitting in the file waiting for a positional match is what
 * caused this. This is the second time positional selection has done it here —
 * the pillar medallions had the same bug. Keying by identity means a content
 * rewrite can no longer silently re-point artwork, and an unrecognised title
 * falls back to the plain plate rather than to whichever motif happens to be
 * third in the file.
 */
const MOTIFS: Record<string, (p: { uid: string }) => ReactElement> = {
  // Concentric bands under inspection — what this one was drawn for.
  "Gold Jewellery": BandMotif,
  // The graduated arc: silver is weighed on the same basis, against its own price.
  Silver: GraduationMotif,
  // Stacked bar edges seen end-on. The only plate that currently renders.
  "Bars & Bullion": BullionMotif,
  // Coins is deliberately absent. There are three motifs and four panels, and no
  // coin motif was ever drawn. Giving it a duplicate of another panel's artwork
  // would look like a mistake the moment two plates were visible at once, so it
  // falls back to the plain struck plate — which is honest and, since Coins
  // carries a photograph, currently unreachable anyway.
};

function ServicePlate({ index, title }: { index: number; title: string }) {
  const uid = `plate-${index}`;
  const Motif = MOTIFS[title];

  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id={`${uid}-metal`} x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" stopColor="#0a0908" />
          <stop offset="45%" stopColor="#16130f" />
          <stop offset="100%" stopColor="#060605" />
        </linearGradient>
        <linearGradient id={`${uid}-gold`} x1="0%" y1="0%" x2="100%" y2="60%">
          <stop offset="0%" stopColor="#6b4a12" />
          <stop offset="34%" stopColor="#d7a83d" />
          <stop offset="52%" stopColor="#ffe9a8" />
          <stop offset="72%" stopColor="#b98220" />
          <stop offset="100%" stopColor="#4d3515" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="30%" cy="18%" r="72%">
          <stop offset="0%" stopColor="#b98220" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="500" fill={`url(#${uid}-metal)`} />
      <rect width="400" height="500" fill={`url(#${uid}-glow)`} />

      {Motif ? <Motif uid={uid} /> : null}

      {/* Inner rule — the plate's own frame, kept a hair inside the edge. */}
      <rect
        x="14"
        y="14"
        width="372"
        height="472"
        fill="none"
        stroke={`url(#${uid}-gold)`}
        strokeOpacity="0.3"
        strokeWidth="1"
      />
    </svg>
  );
}

/** GOLD VALUATION — a graduated quadrant. */
function GraduationMotif({ uid }: { uid: string }) {
  return (
    <g>
      {Array.from({ length: 26 }, (_, i) => {
        const a = -Math.PI * 0.5 + (i / 25) * Math.PI * 0.62;
        const major = i % 5 === 0;
        const r1 = major ? 118 : 138;
        const r2 = 160;
        return (
          <line
            key={i}
            x1={104 + Math.cos(a) * r1}
            y1={330 + Math.sin(a) * r1}
            x2={104 + Math.cos(a) * r2}
            y2={330 + Math.sin(a) * r2}
            stroke={`url(#${uid}-gold)`}
            strokeOpacity={major ? 0.9 : 0.42}
            strokeWidth={major ? 2.4 : 1.1}
          />
        );
      })}
      <path
        d="M 104 330 m -168 0 a 168 168 0 0 1 300 -98"
        fill="none"
        stroke={`url(#${uid}-gold)`}
        strokeOpacity="0.35"
        strokeWidth="1.2"
      />
      <circle
        cx="104"
        cy="330"
        r="8"
        fill="none"
        stroke={`url(#${uid}-gold)`}
        strokeWidth="1.6"
      />
      <path
        d="M 104 330 L 236 214"
        stroke={`url(#${uid}-gold)`}
        strokeWidth="2.2"
        opacity="0.85"
      />
    </g>
  );
}

/** BULLION EXCHANGE — stacked bar edges, seen end-on. */
function BullionMotif({ uid }: { uid: string }) {
  return (
    <g>
      {[0, 1, 2, 3].map((row) => {
        const y = 150 + row * 78;
        const inset = row * 14;
        return (
          <g key={row} opacity={1 - row * 0.14}>
            <path
              d={`M ${74 + inset} ${y + 54} L ${326 - inset} ${y + 54} L ${312 - inset} ${y} L ${88 + inset} ${y} Z`}
              fill="none"
              stroke={`url(#${uid}-gold)`}
              strokeOpacity="0.55"
              strokeWidth="1.4"
            />
            <line
              x1={88 + inset}
              y1={y + 4}
              x2={312 - inset}
              y2={y + 4}
              stroke={`url(#${uid}-gold)`}
              strokeOpacity="0.75"
              strokeWidth="1"
            />
          </g>
        );
      })}
      <line
        x1="150"
        y1="118"
        x2="250"
        y2="118"
        stroke={`url(#${uid}-gold)`}
        strokeOpacity="0.5"
        strokeWidth="1"
      />
    </g>
  );
}

/** JEWELLERY EVALUATION — concentric bands under inspection. */
function BandMotif({ uid }: { uid: string }) {
  return (
    <g>
      {[168, 138, 108, 78, 48].map((r, i) => (
        <circle
          key={r}
          cx="200"
          cy="250"
          r={r}
          fill="none"
          stroke={`url(#${uid}-gold)`}
          strokeOpacity={0.24 + i * 0.13}
          strokeWidth={i === 2 ? 3.4 : 1.1}
        />
      ))}
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={200 + Math.cos(a) * 172}
            y1={250 + Math.sin(a) * 172}
            x2={200 + Math.cos(a) * (i % 3 === 0 ? 182 : 178)}
            y2={250 + Math.sin(a) * (i % 3 === 0 ? 182 : 178)}
            stroke={`url(#${uid}-gold)`}
            strokeOpacity="0.5"
            strokeWidth="1.2"
          />
        );
      })}
      <circle
        cx="200"
        cy="250"
        r="17"
        fill={`url(#${uid}-gold)`}
        opacity="0.85"
      />
    </g>
  );
}


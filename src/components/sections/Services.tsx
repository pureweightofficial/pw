import Image from 'next/image';
import Link from 'next/link';
import { assetPath } from '@/lib/asset';
import { BeamDivider, Eyebrow, Section } from '@/components/ui/primitives';
import { services } from '@/lib/site';

/**
 * SERVICES
 *
 * Large alternating editorial panels rather than a grid of six identical cards.
 * A grid flattens four quite different propositions into one visual weight; the
 * alternating layout lets each one have a full spread and its own rhythm.
 *
 * ON THE IMAGERY: the first three panels now carry licensed photography
 * (Unsplash License — commercial use, no attribution required; provenance and
 * selection rules in public/img/CREDITS.md). Each is desaturated and warmed by
 * a gold overlay so stock photography sits inside the brand's light rather than
 * next to it — untreated stock is the fastest way to break a bespoke palette.
 *
 * The fourth panel keeps its engraved plate on purpose. Every stock image of a
 * "private consultation" reads as generic corporate office and would cheapen
 * the section; only photography of the real premises will serve it.
 *
 * Every service is marked `confirmed: false` in `site.ts` until the client
 * confirms the offering, and renders with a visible pending marker until then.
 */

export function Services() {
  return (
    <Section id="services" material="steel" labelledBy="services-heading" className="py-24 lg:py-36">
      <div className="shell">
        <div className="max-w-3xl">
          <Eyebrow className="mb-8 will-reveal">Chapter 03 — The Services</Eyebrow>
          <h2
            id="services-heading"
            className="font-display text-chapter font-semibold text-ivory will-reveal"
          >
            What We <span className="accent-accent-italic text-gold-high/90">Examine</span>
          </h2>
          <p className="mt-7 max-w-xl text-lead text-ash will-reveal">
            Each service is a different kind of examination. What they share is the order of
            operations: measure, verify, explain, and only then discuss value.
          </p>
        </div>
      </div>

      <div className="mt-20 lg:mt-28">
        {services.map((service, index) => {
          const reversed = index % 2 === 1;

          return (
            <article
              key={service.title}
              className="shell border-t border-gold-antique/16 py-16 first:border-t-0 lg:py-24"
            >
              <div
                className={`grid items-center gap-12 lg:grid-cols-12 lg:gap-20 ${
                  reversed ? 'lg:[&>*:first-child]:order-2' : ''
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
                          alt=""
                          fill
                          sizes="(max-width: 1024px) 100vw, 40vw"
                          className="object-cover"
                          style={{ filter: 'saturate(0.55) contrast(1.08) brightness(0.72)' }}
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
                          className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_45%,transparent_10%,rgba(5,4,6,0.55)_75%,rgba(5,4,6,0.9)_100%)]"
                        />
                      </>
                    ) : (
                      <ServicePlate index={index} />
                    )}
                    <span className="absolute left-5 top-5 font-display text-6xl font-semibold text-gold-antique/75">
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

                    <h3 className="font-display text-4xl font-semibold text-ivory lg:text-5xl">
                      {service.title}
                    </h3>

                    <p className="mt-5 max-w-xl text-lead text-gold-high/75 accent-italic">
                      {service.summary}
                    </p>

                    <p className="mt-6 max-w-xl text-lead text-ivory/70">{service.body}</p>

                    <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                      {service.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-center gap-2.5 text-[0.72rem] tracking-[0.13em] text-ash uppercase"
                        >
                          <span aria-hidden="true" className="h-px w-5 bg-gold-antique/60" />
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
 * graduations, stacked bars, concentric bands and a vaulted arch. Struck rather
 * than drawn — every line has a dark cut and a lit shoulder, so the plate reads
 * as metal under the same key light as everything else.
 */
function ServicePlate({ index }: { index: number }) {
  const uid = `plate-${index}`;

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

      {index === 0 ? <GraduationMotif uid={uid} /> : null}
      {index === 1 ? <BullionMotif uid={uid} /> : null}
      {index === 2 ? <BandMotif uid={uid} /> : null}
      {index === 3 ? <ArchMotif uid={uid} /> : null}

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
      <circle cx="104" cy="330" r="8" fill="none" stroke={`url(#${uid}-gold)`} strokeWidth="1.6" />
      <path d="M 104 330 L 236 214" stroke={`url(#${uid}-gold)`} strokeWidth="2.2" opacity="0.85" />
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
      <line x1="150" y1="118" x2="250" y2="118" stroke={`url(#${uid}-gold)`} strokeOpacity="0.5" strokeWidth="1" />
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
      <circle cx="200" cy="250" r="17" fill={`url(#${uid}-gold)`} opacity="0.85" />
    </g>
  );
}

/** PRIVATE APPOINTMENTS — a vaulted opening into a lit room. */
function ArchMotif({ uid }: { uid: string }) {
  return (
    <g>
      <path
        d="M 116 400 L 116 214 A 84 84 0 0 1 284 214 L 284 400"
        fill="none"
        stroke={`url(#${uid}-gold)`}
        strokeOpacity="0.6"
        strokeWidth="1.6"
      />
      <path
        d="M 138 400 L 138 220 A 62 62 0 0 1 262 220 L 262 400"
        fill="none"
        stroke={`url(#${uid}-gold)`}
        strokeOpacity="0.34"
        strokeWidth="1"
      />
      {/* Light falling through the opening. */}
      <path d="M 160 400 L 200 236 L 240 400 Z" fill={`url(#${uid}-gold)`} opacity="0.07" />
      <line x1="116" y1="400" x2="284" y2="400" stroke={`url(#${uid}-gold)`} strokeOpacity="0.7" strokeWidth="2" />
      <circle cx="200" cy="196" r="6" fill={`url(#${uid}-gold)`} opacity="0.9" />
      {/* Filigree spandrels. */}
      <path
        d="M 118 216 q 20 -14 30 -34 M 282 216 q -20 -14 -30 -34"
        fill="none"
        stroke={`url(#${uid}-gold)`}
        strokeOpacity="0.42"
        strokeWidth="1.2"
      />
    </g>
  );
}

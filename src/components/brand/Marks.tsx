/**
 * PUREWEIGHT — RESPONSIVE BRAND SYSTEM
 *
 * ---------------------------------------------------------------------------
 * PLACEHOLDER NOTICE
 * ---------------------------------------------------------------------------
 * The supplied Pureweight logo file was NOT available when this was built. These
 * marks are an original interpretation drawn from the written description of it:
 * an ornamental circular frame, a vintage balance scale, engraved serif
 * lettering, filigree detail and a PW monogram.
 *
 * They are production-quality and self-consistent, but they are placeholders.
 * Replace the artwork here with the real mark before launch — the three
 * variants, their sizes and their usage rules are all correct and should be
 * kept; only the drawing inside them changes. See CONTENT-PLACEHOLDERS.md.
 * ---------------------------------------------------------------------------
 *
 * Three variants, because one highly-detailed emblem cannot survive every size:
 *
 *   EMBLEM    loader, brand story, footer. Full ornament. Never below 120px.
 *   WORDMARK  desktop navigation, page headers. Horizontal lockup.
 *   MONOGRAM  mobile nav, favicon, compact buttons, loading indicator.
 *
 * All three are inline SVG: no image request, crisp at any density, and they
 * inherit the gold ramp from the same tokens as the rest of the page.
 */

type MarkProps = {
  className?: string;
  /** Unique per instance — SVG ids are global, and these appear more than once. */
  uid?: string;
  title?: string;
};

/* -------------------------------------------------------------------------- */
/* SHARED DEFS                                                                */
/* -------------------------------------------------------------------------- */

function GoldDefs({ uid }: { uid: string }) {
  return (
    <defs>
      <linearGradient id={`${uid}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8a5f18" />
        <stop offset="22%" stopColor="#d7a83d" />
        <stop offset="42%" stopColor="#ffe9a8" />
        <stop offset="60%" stopColor="#b98220" />
        <stop offset="82%" stopColor="#f2ce72" />
        <stop offset="100%" stopColor="#6b4a12" />
      </linearGradient>
      <linearGradient id={`${uid}-gold-soft`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f2ce72" />
        <stop offset="55%" stopColor="#b98220" />
        <stop offset="100%" stopColor="#4d3515" />
      </linearGradient>
    </defs>
  );
}

/**
 * The balance glyph — the reduced, drawable form of the instrument that appears
 * in the emblem and as the divider ornament throughout the site.
 */
function BalanceGlyph({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <g
      className="pw-glyph"
      fill="none"
      stroke={stroke}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Base */}
      <path d="M 96 158 L 144 158" strokeWidth={3.4} />
      <path d="M 104 158 L 108 150 L 132 150 L 136 158 Z" fill={fill} strokeWidth={1.8} />
      {/* Column */}
      <path d="M 120 150 L 120 92" strokeWidth={3} />
      {/* Beam */}
      <path d="M 74 92 L 166 92" strokeWidth={3} />
      {/* Finial */}
      <path d="M 120 92 L 120 84 M 116 86 L 120 78 L 124 86" strokeWidth={2} />
      {/* Chains */}
      <path d="M 74 92 L 66 118 M 74 92 L 82 118" strokeWidth={1.5} />
      <path d="M 166 92 L 158 118 M 166 92 L 174 118" strokeWidth={1.5} />
      {/* Pans */}
      <path d="M 60 118 L 88 118 A 14 9 0 0 1 60 118 Z" fill={fill} strokeWidth={2} />
      <path d="M 152 118 L 180 118 A 14 9 0 0 1 152 118 Z" fill={fill} strokeWidth={2} />
      {/* Suspension eyes */}
      <circle cx="74" cy="92" r="2.6" fill={fill} strokeWidth={1.4} />
      <circle cx="166" cy="92" r="2.6" fill={fill} strokeWidth={1.4} />
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* FULL EMBLEM                                                                */
/* -------------------------------------------------------------------------- */

export type EmblemProps = MarkProps & {
  /** Exposes the ring and glyph as strokeable paths for the loader trace. */
  traceable?: boolean;
};

export function PWEmblem({
  className = '',
  uid = 'pw-emblem',
  title = 'Pureweight Gold Exchange',
  traceable = false,
}: EmblemProps) {
  const gold = `url(#${uid}-gold)`;

  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      role="img"
      aria-label={title}
      style={{ overflow: 'visible' }}
    >
      <GoldDefs uid={uid} />
      <title>{title}</title>

      {/* Ornamental frame: an outer rule, a beaded ring, and an inner rule. */}
      <circle
        className={traceable ? 'pw-trace pw-trace-outer' : undefined}
        cx="120"
        cy="120"
        r="116"
        fill="none"
        stroke={gold}
        strokeWidth="1.4"
        pathLength={1}
      />
      <circle cx="120" cy="120" r="110" fill="none" stroke={gold} strokeWidth="0.7" opacity="0.6" />

      {/* Beading — the filigree rhythm from the frame, reduced to its essence. */}
      <g fill={gold} opacity="0.85">
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
          return (
            <circle
              key={i}
              cx={120 + Math.cos(a) * 104}
              cy={120 + Math.sin(a) * 104}
              r={i % 5 === 0 ? 2.1 : 1.1}
            />
          );
        })}
      </g>

      <circle
        className={traceable ? 'pw-trace pw-trace-inner' : undefined}
        cx="120"
        cy="120"
        r="96"
        fill="none"
        stroke={gold}
        strokeWidth="1.1"
        pathLength={1}
      />

      {/* Corner filigree at the cardinal points. */}
      <g stroke={gold} strokeWidth="1.1" fill="none" opacity="0.7">
        {[0, 90, 180, 270].map((deg) => (
          <g key={deg} transform={`rotate(${deg} 120 120)`}>
            <path d="M 120 20 q 8 6 12 14 M 120 20 q -8 6 -12 14" />
          </g>
        ))}
      </g>

      <BalanceGlyph stroke={gold} fill={gold} />

      {/* Engraved lettering. Arc above, straight rule below. */}
      <path id={`${uid}-arc`} d="M 120 120 m -78 0 a 78 78 0 0 1 156 0" fill="none" />
      <text
        fontSize="17"
        letterSpacing="6.2"
        fill={gold}
        style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}
      >
        <textPath href={`#${uid}-arc`} startOffset="50%" textAnchor="middle">
          PUREWEIGHT
        </textPath>
      </text>

      <g>
        <path d="M 78 186 L 162 186" stroke={gold} strokeWidth="0.9" opacity="0.7" />
        <text
          x="120"
          y="203"
          textAnchor="middle"
          fontSize="9.4"
          letterSpacing="4.6"
          fill={gold}
          style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}
        >
          GOLD EXCHANGE
        </text>
        {/* Small struck lozenges either side of the rule. */}
        <path d="M 70 186 l 4 -4 l 4 4 l -4 4 z" fill={gold} opacity="0.8" />
        <path d="M 162 186 l 4 -4 l 4 4 l -4 4 z" fill={gold} opacity="0.8" />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* HORIZONTAL WORDMARK                                                        */
/* -------------------------------------------------------------------------- */

export function PWWordmark({
  className = '',
  uid = 'pw-wordmark',
  title = 'Pureweight Gold Exchange',
}: MarkProps) {
  const gold = `url(#${uid}-gold)`;

  return (
    <svg viewBox="0 0 300 52" className={className} role="img" aria-label={title}>
      <GoldDefs uid={uid} />
      <title>{title}</title>

      {/* Compact balance mark, sized to the cap height of the wordmark. */}
      <g transform="translate(2 4) scale(0.24)">
        <BalanceGlyph stroke={gold} fill={gold} />
      </g>

      <text
        x="56"
        y="26"
        fontSize="25"
        letterSpacing="4.4"
        fill={gold}
        style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}
      >
        PUREWEIGHT
      </text>

      <path d="M 57 34 L 262 34" stroke={gold} strokeWidth="0.7" opacity="0.55" />

      <text
        x="57"
        y="46"
        fontSize="8.2"
        letterSpacing="5.6"
        fill="#918d84"
        style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}
      >
        GOLD EXCHANGE
      </text>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* MONOGRAM                                                                   */
/* -------------------------------------------------------------------------- */

export function PWMonogram({
  className = '',
  uid = 'pw-monogram',
  title = 'Pureweight',
}: MarkProps) {
  const gold = `url(#${uid}-gold)`;

  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title}>
      <GoldDefs uid={uid} />
      <title>{title}</title>

      <circle cx="32" cy="32" r="30" fill="none" stroke={gold} strokeWidth="1.1" />
      <circle cx="32" cy="32" r="26.5" fill="none" stroke={gold} strokeWidth="0.6" opacity="0.55" />

      {/* Four struck lozenges at the cardinals — the emblem's beading, reduced
          to the smallest ornament that still survives at favicon size. */}
      <g fill={gold} opacity="0.85">
        {[0, 90, 180, 270].map((deg) => (
          <path key={deg} transform={`rotate(${deg} 32 32)`} d="M 32 3.6 l 2 2.4 l -2 2.4 l -2 -2.4 z" />
        ))}
      </g>

      <text
        x="32"
        y="40.5"
        textAnchor="middle"
        fontSize="25"
        letterSpacing="0.5"
        fill={gold}
        style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}
      >
        PW
      </text>

      {/* The beam, struck through beneath the monogram. */}
      <path d="M 18 45 L 46 45" stroke={gold} strokeWidth="0.9" opacity="0.75" />
      <path d="M 30 45.6 l 2 3 l 2 -3 z" fill={gold} opacity="0.75" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* BEAM ORNAMENT                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The section divider: the emblem's beam and fulcrum, on its own.
 *
 * This is the piece of the identity that does the most work on the page. It
 * appears between every major section, and its `tilt` is driven by the same
 * scroll value that levels the 3D instrument — so the page's own rules come
 * into balance alongside the object.
 */
export function BeamRule({
  className = '',
  uid = 'pw-beam',
  tiltDeg = 0,
}: MarkProps & { tiltDeg?: number }) {
  const gold = `url(#${uid}-gold)`;

  return (
    <svg
      viewBox="0 0 400 24"
      className={className}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
    >
      <GoldDefs uid={uid} />
      <g
        style={{
          transform: `rotate(${tiltDeg}deg)`,
          transformOrigin: '200px 10px',
          transition: 'transform 900ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <path d="M 8 10 L 392 10" stroke={gold} strokeWidth="1" opacity="0.5" />
        <circle cx="8" cy="10" r="2" fill={gold} opacity="0.8" />
        <circle cx="392" cy="10" r="2" fill={gold} opacity="0.8" />
      </g>
      {/* The fulcrum stays put; only the beam above it moves. */}
      <path d="M 194 12 L 200 20 L 206 12 Z" fill={gold} opacity="0.65" />
    </svg>
  );
}

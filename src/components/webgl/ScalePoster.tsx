/**
 * THE STATIC POSTER
 *
 * Shown whenever the WebGL scene is not the right answer: no GPU, a data-saver
 * signal, a lost context, a slow first paint, or the moment before the scene has
 * compiled. It is drawn as inline SVG rather than a rendered PNG so it is a few
 * KB, resolution-independent, part of the HTML payload (no extra request), and
 * themable from the same gold ramp as everything else.
 *
 * Crucially it holds the *same composition* as the 3D hero — same subject, same
 * placement, same negative space above and left for the headline. A visitor
 * without WebGL gets a quieter version of the page, not a different one.
 *
 * Decorative: the surrounding section carries the real content, so this is
 * aria-hidden and contributes nothing to the accessibility tree.
 */

export type ScalePosterProps = {
  className?: string;
  /** Dims the poster while a real scene fades in over the top of it. */
  dimmed?: boolean;
};

export function ScalePoster({
  className = "",
  dimmed = false,
}: ScalePosterProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      style={{
        width: "100%",
        height: "100%",
        opacity: dimmed ? 0.55 : 1,
        transition: "opacity 900ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <defs>
        {/* The gold ramp: dark -> body -> highlight -> pale -> dark. The dark
            stops are what make it read as metal rather than as yellow. */}
        <linearGradient id="pw-gold" x1="0%" y1="0%" x2="100%" y2="18%">
          <stop offset="0%" stopColor="#5c3f10" />
          <stop offset="18%" stopColor="#b98220" />
          <stop offset="38%" stopColor="#f2ce72" />
          <stop offset="47%" stopColor="#ffe9a8" />
          <stop offset="58%" stopColor="#d7a83d" />
          <stop offset="76%" stopColor="#8a5f18" />
          <stop offset="100%" stopColor="#4d3515" />
        </linearGradient>

        <linearGradient id="pw-gold-v" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe9a8" />
          <stop offset="26%" stopColor="#d7a83d" />
          <stop offset="62%" stopColor="#8a5f18" />
          <stop offset="100%" stopColor="#3d2b11" />
        </linearGradient>

        <linearGradient id="pw-iron" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0a0908" />
          <stop offset="34%" stopColor="#26231e" />
          <stop offset="52%" stopColor="#3a352d" />
          <stop offset="70%" stopColor="#1b1915" />
          <stop offset="100%" stopColor="#080807" />
        </linearGradient>

        <radialGradient id="pw-key" cx="26%" cy="8%" r="62%">
          <stop offset="0%" stopColor="#b98220" stopOpacity="0.3" />
          <stop offset="55%" stopColor="#4d3515" stopOpacity="0.09" />
          <stop offset="100%" stopColor="#030303" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="pw-ground" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="pw-shaft" x1="12%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%" stopColor="#ffdca8" stopOpacity="0.13" />
          <stop offset="100%" stopColor="#ffdca8" stopOpacity="0" />
        </linearGradient>

        <radialGradient id="pw-vignette" cx="50%" cy="46%" r="72%">
          <stop offset="40%" stopColor="#030303" stopOpacity="0" />
          <stop offset="100%" stopColor="#030303" stopOpacity="0.92" />
        </radialGradient>
      </defs>

      <rect width="1200" height="900" fill="#030303" />
      <rect width="1200" height="900" fill="url(#pw-key)" />

      {/* The key light entering the room from upper left. */}
      <path
        d="M 60 -40 L 420 -40 L 760 900 L 250 900 Z"
        fill="url(#pw-shaft)"
      />

      {/* Contact shadow under the plinth. */}
      <ellipse cx="600" cy="772" rx="290" ry="42" fill="url(#pw-ground)" />

      {/* ---- Plinth: stepped, wide at the floor ---- */}
      <g>
        <path
          d="M 372 770 L 828 770 L 812 742 L 388 742 Z"
          fill="url(#pw-iron)"
        />
        <path d="M 388 742 L 812 742 L 796 726 L 404 726 Z" fill="#141210" />
        <path
          d="M 404 726 L 796 726 L 762 700 L 438 700 Z"
          fill="url(#pw-iron)"
        />
        {/* Inlaid ornamental band. */}
        <rect
          x="392"
          y="729"
          width="416"
          height="6"
          fill="url(#pw-gold)"
          opacity="0.9"
        />
        <rect
          x="440"
          y="702"
          width="320"
          height="3"
          fill="url(#pw-gold)"
          opacity="0.55"
        />
      </g>

      {/* ---- Column: turned baluster ---- */}
      <g>
        <path
          d="M 566 700
             C 566 660, 572 620, 578 560
             C 582 500, 584 430, 583 372
             L 617 372
             C 616 430, 618 500, 622 560
             C 628 620, 634 660, 634 700 Z"
          fill="url(#pw-iron)"
        />
        {/* Turned gold collars. */}
        <ellipse
          cx="600"
          cy="668"
          rx="42"
          ry="7"
          fill="url(#pw-gold)"
          opacity="0.92"
        />
        <ellipse
          cx="600"
          cy="404"
          rx="26"
          ry="5"
          fill="url(#pw-gold)"
          opacity="0.92"
        />
        <ellipse
          cx="600"
          cy="372"
          rx="21"
          ry="4.5"
          fill="url(#pw-gold)"
          opacity="0.7"
        />
      </g>

      {/* ---- Graduation arc and pointer ---- */}
      <g opacity="0.85">
        <path
          d="M 512 400 A 116 116 0 0 0 688 400"
          fill="none"
          stroke="#b98220"
          strokeOpacity="0.42"
          strokeWidth="1.4"
        />
        {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => {
          const angle = Math.PI / 2 + (i / 4) * 0.36;
          const cx = 600;
          const cy = 288;
          const outer = 116;
          const inner = outer - (i === 0 ? 20 : 11);
          return (
            <line
              key={i}
              x1={cx + Math.cos(angle) * inner}
              y1={cy + Math.sin(angle) * inner}
              x2={cx + Math.cos(angle) * outer}
              y2={cy + Math.sin(angle) * outer}
              stroke={i === 0 ? "#ffe9a8" : "#d7a83d"}
              strokeOpacity={i === 0 ? 0.95 : 0.5}
              strokeWidth={i === 0 ? 2.6 : 1.4}
            />
          );
        })}
        {/* The pointer, resting exactly on zero. */}
        <path
          d="M 596 292 L 604 292 L 601.4 404 L 598.6 404 Z"
          fill="url(#pw-gold-v)"
        />
      </g>

      {/* ---- Fulcrum and beam ---- */}
      <g>
        <path d="M 578 300 L 622 300 L 612 268 L 588 268 Z" fill="#2a2620" />
        {/* Tapered beam: deepest at the pivot, fine at the eyes. */}
        <path
          d="M 236 284
             C 330 268, 462 262, 600 260
             C 738 262, 870 268, 964 284
             C 870 300, 738 306, 600 308
             C 462 306, 330 300, 236 284 Z"
          fill="url(#pw-gold)"
        />
        <ellipse cx="600" cy="284" rx="22" ry="11" fill="#8a5f18" />
        <ellipse cx="600" cy="282" rx="14" ry="7" fill="url(#pw-gold)" />
        {/* Finial. */}
        <path
          d="M 592 262 L 608 262 L 604 244 L 601 232 L 598 244 Z"
          fill="url(#pw-gold-v)"
        />
        {/* Suspension eyes. */}
        <circle
          cx="238"
          cy="284"
          r="9"
          fill="none"
          stroke="url(#pw-gold)"
          strokeWidth="4"
        />
        <circle
          cx="962"
          cy="284"
          r="9"
          fill="none"
          stroke="url(#pw-gold)"
          strokeWidth="4"
        />
      </g>

      {/* ---- Left hanger: bullion ---- */}
      <g>
        <line
          x1="238"
          y1="292"
          x2="168"
          y2="512"
          stroke="#3a352d"
          strokeWidth="2.6"
        />
        <line
          x1="238"
          y1="292"
          x2="238"
          y2="512"
          stroke="#4a443a"
          strokeWidth="2.6"
        />
        <line
          x1="238"
          y1="292"
          x2="308"
          y2="512"
          stroke="#3a352d"
          strokeWidth="2.6"
        />

        <path
          d="M 150 516 C 150 556, 200 578, 238 578 C 276 578, 326 556, 326 516 Z"
          fill="url(#pw-iron)"
        />
        <ellipse
          cx="238"
          cy="516"
          rx="88"
          ry="17"
          fill="url(#pw-gold)"
          opacity="0.95"
        />
        <ellipse cx="238" cy="516" rx="78" ry="12" fill="#14110d" />

        {/* Cast bars. */}
        <g>
          <path
            d="M 176 512 L 232 512 L 228 490 L 182 490 Z"
            fill="url(#pw-gold)"
          />
          <path
            d="M 240 512 L 296 512 L 292 490 L 246 490 Z"
            fill="url(#pw-gold)"
          />
          <path
            d="M 208 488 L 266 488 L 262 466 L 214 466 Z"
            fill="url(#pw-gold)"
          />
          <rect
            x="222"
            y="472"
            width="30"
            height="2"
            fill="#7a5414"
            opacity="0.7"
          />
          <rect
            x="226"
            y="477"
            width="22"
            height="2"
            fill="#7a5414"
            opacity="0.55"
          />
        </g>
      </g>

      {/* ---- Right hanger: the sealed valuation block (deliberately not cash) ---- */}
      <g>
        <line
          x1="962"
          y1="292"
          x2="892"
          y2="512"
          stroke="#3a352d"
          strokeWidth="2.6"
        />
        <line
          x1="962"
          y1="292"
          x2="962"
          y2="512"
          stroke="#4a443a"
          strokeWidth="2.6"
        />
        <line
          x1="962"
          y1="292"
          x2="1032"
          y2="512"
          stroke="#3a352d"
          strokeWidth="2.6"
        />

        <path
          d="M 874 516 C 874 556, 924 578, 962 578 C 1000 578, 1050 556, 1050 516 Z"
          fill="url(#pw-iron)"
        />
        <ellipse
          cx="962"
          cy="516"
          rx="88"
          ry="17"
          fill="url(#pw-gold)"
          opacity="0.95"
        />
        <ellipse cx="962" cy="516" rx="78" ry="12" fill="#14110d" />

        <g>
          <path
            d="M 924 512 L 1000 512 L 1000 442 L 924 442 Z"
            fill="#0d0c0a"
          />
          <path d="M 924 442 L 1000 442 L 998 434 L 926 434 Z" fill="#191713" />
          <rect
            x="920"
            y="486"
            width="84"
            height="9"
            fill="url(#pw-gold)"
            opacity="0.9"
          />
          <rect
            x="920"
            y="452"
            width="84"
            height="6"
            fill="url(#pw-gold)"
            opacity="0.72"
          />
          <circle cx="962" cy="428" r="13" fill="url(#pw-gold)" />
          <circle
            cx="962"
            cy="428"
            r="8"
            fill="none"
            stroke="#5c3f10"
            strokeWidth="1.6"
          />
        </g>
      </g>

      <rect width="1200" height="900" fill="url(#pw-vignette)" />
    </svg>
  );
}

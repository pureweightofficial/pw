"use client";

import { AmbientScene, type AmbientVariant } from "./AmbientScene";
import { AssayScene } from "./AssayScene";
import { FinaleScene } from "./FinaleScene";
// One definition of each poster, in the three-free module. The gated call sites
// render these WITHOUT loading the renderer; this module renders the same ones
// underneath a canvas. Two copies would drift, and the drift would only show on
// the devices least able to report it.
import { AmbientPoster } from "./posters";
import { ScalePoster } from "./ScalePoster";
import { SceneShell } from "./SceneShell";
import { SpecimenScene } from "./SpecimenScene";

/**
 * CANVAS ENTRY POINTS
 *
 * The whole 3D layer — three.js, R3F, drei, every scene — is reached only
 * through this module, and this module is only ever loaded via `next/dynamic`
 * with `ssr: false`. That keeps roughly 600KB of renderer out of the initial
 * bundle: the hero copy, the navigation and the primary CTA are parsed,
 * painted and interactive before a single byte of WebGL is requested.
 *
 * Each export is a thin binding of one scene to the shell's fallback, gating
 * and disposal policy. All the interesting work is in the scenes themselves.
 */

/**
 * The ambient backdrop, bound for any section that wants one.
 *
 * A wider field of view and a camera further back than the subject scenes: this
 * is depth behind copy, not an object being presented. `showFallbackNotice` is
 * off deliberately — if the context fails there is nothing the visitor has lost,
 * so telling them a scene failed would be manufacturing a problem.
 */
export function AmbientCanvas({
  variant,
  channel,
}: {
  variant: AmbientVariant;
  channel?: "progress" | "journey" | "assay" | "finale";
}) {
  return (
    <SceneShell
      camera={{ position: [0, 0.2, 5.4], fov: 42 }}
      /* 0.86 suits atmosphere — dust and half-seen objects. The `bar` variant is
         a PRESENTED object and needs the room lit for it; at 0.86 it rendered as
         a near-black silhouette. */
      exposure={variant === "bar" ? 1.5 : 0.86}
      poster={<AmbientPoster />}
    >
      {(capability) => (
        <AmbientScene
          capability={capability}
          variant={variant}
          channel={channel}
        />
      )}
    </SceneShell>
  );
}

/*
  FireflyCanvas lived here. It left with the firefly field: a full-viewport
  atmosphere canvas cost ~43fps of recompositing and, once the page surfaces
  went opaque, was invisible while still paying it. Windowed scenes only.
*/

/*
  HeroCanvas was removed, along with HeroScene and the bench geometry and
  material only it used.

  The hero's subject is the supplied film, not a procedural scale — two gold
  balances on black in one frame read as a mistake, so the WebGL instrument was
  withdrawn from the hero and kept where it is genuinely interactive. What was
  left behind was an export nobody called, and dead code that looks live is a
  trap: the obvious way to "restore" the hero would have been to mount this
  again, undoing a deliberate art-direction decision.

  It was not free, either. It was the only consumer of drei's ContactShadows,
  so the whole component shipped in this chunk for every visitor who gets 3D and
  rendered for none of them.
*/

/**
 * The specimen: raw gold presented inside the valuation journey's window.
 * Camera close and slightly high — an object on a bench being examined, not a
 * product on a turntable. Exposure up like the `bar` ambient variant, because
 * a presented object needs the room lit for it.
 */
export function SpecimenCanvas() {
  return (
    <SceneShell
      camera={{ position: [0.1, 0.35, 5.6], fov: 30 }}
      /*
        1.3 -> 0.98. ACES rolls highlights off gently, which is exactly what
        let this hide: at 1.3 the mass's speculars were pinned at the top of
        the curve, so the brightest third of the object was one undifferentiated
        white-orange field with no form in it. Pulling roughly half a stop back
        puts the highlights inside the curve again, where antique gold has hue
        instead of glare.
      */
      exposure={0.98}
      poster={<AmbientPoster />}
    >
      {(capability) => <SpecimenScene capability={capability} />}
    </SceneShell>
  );
}

export function AssayCanvas() {
  return (
    <SceneShell
      camera={{ position: [0, 0.14, 3.1], fov: 30 }}
      /*
        1.12 -> 0.88. Same correction as the specimen's, same reason: the
        signet fills a square frame at close range, so its speculars were
        pinned at the top of the ACES curve and the piece read as a glowing
        ring rather than a metal one. Antique gold has hue; glare does not.
      */
      exposure={0.88}
      poster={<AssayPoster />}
    >
      {(capability) => <AssayScene capability={capability} />}
    </SceneShell>
  );
}

export function FinaleCanvas() {
  return (
    <SceneShell
      camera={{ position: [0.42, 2.02, 4.6], fov: 30 }}
      /*
        1.1 -> 1.34 -> 1.75, in two rounds, because the first correction was
        right in direction and short in size.

        The closing scene renders behind a scrim and a vignette, and at 1.1 it
        was so far under that reviewers reading the page cold recorded the
        finale as "nearly black" and "a void". 1.34 helped and was still not
        enough: a second, independent pass measured the beam at "10-15%
        luminance", dimmer than the hero scale, dimmer than the medallion
        icons, dimmer even than the footer logo — and noted that a page which
        peaks in its hero and decays has no climax at all.

        1.75 with the scrim now scoped to the copy (see FinalBalance) puts the
        brass beam and the pan rims at the top of the frame's luminance range,
        which is where the last object in the story belongs. The gold does not
        blow out: ACES rolls the speculars off, and the material's true
        roughness is 0.23-0.38 rather than the near-mirror it once was, so what
        comes back is a lit surface rather than glare.
      */
      exposure={1.75}
      poster={<ScalePoster />}
    >
      {(capability) => <FinaleScene capability={capability} />}
    </SceneShell>
  );
}

/**
 * Static stand-in for the assay subject. Same composition as the live scene:
 * a heavy signet, square to the viewer, with the struck fineness mark legible
 * and the measurement ring closed around it.
 */
function AssayPoster() {
  return (
    <svg
      viewBox="0 0 800 800"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id="assay-gold" x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" stopColor="#4d3515" />
          <stop offset="22%" stopColor="#b98220" />
          <stop offset="40%" stopColor="#ffe9a8" />
          <stop offset="55%" stopColor="#d7a83d" />
          <stop offset="76%" stopColor="#7a5414" />
          <stop offset="100%" stopColor="#3d2b11" />
        </linearGradient>
        <radialGradient id="assay-glow" cx="38%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#b98220" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#030303" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="800" height="800" fill="#0a0908" />
      <rect width="800" height="800" fill="url(#assay-glow)" />

      {/* Measurement ring and struck ticks. */}
      <circle
        cx="400"
        cy="410"
        r="286"
        fill="none"
        stroke="#f2ce72"
        strokeOpacity="0.28"
        strokeWidth="1.4"
      />
      {Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        const major = i % 6 === 0;
        const r1 = 300;
        const r2 = r1 + (major ? 20 : 10);
        return (
          <line
            key={i}
            x1={400 + Math.cos(a) * r1}
            y1={410 + Math.sin(a) * r1}
            x2={400 + Math.cos(a) * r2}
            y2={410 + Math.sin(a) * r2}
            stroke="#d7a83d"
            strokeOpacity={major ? 0.55 : 0.3}
            strokeWidth={major ? 2.2 : 1.2}
          />
        );
      })}

      {/* The band. */}
      <ellipse
        cx="400"
        cy="430"
        rx="176"
        ry="168"
        fill="none"
        stroke="url(#assay-gold)"
        strokeWidth="72"
      />
      <ellipse
        cx="400"
        cy="430"
        rx="176"
        ry="168"
        fill="none"
        stroke="#000"
        strokeOpacity="0.28"
        strokeWidth="8"
      />

      {/* The bezel, with the struck fineness mark. */}
      <ellipse cx="400" cy="256" rx="102" ry="52" fill="url(#assay-gold)" />
      <ellipse
        cx="400"
        cy="252"
        rx="86"
        ry="42"
        fill="none"
        stroke="#5c3f10"
        strokeOpacity="0.85"
        strokeWidth="3"
      />
      <text
        x="400"
        y="264"
        textAnchor="middle"
        fontSize="42"
        letterSpacing="3"
        fill="#4d3515"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
      >
        916
      </text>
    </svg>
  );
}

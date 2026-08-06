"use client";

import { AmbientScene, type AmbientVariant } from "./AmbientScene";
import { AssayScene } from "./AssayScene";
import { FinaleScene } from "./FinaleScene";
import { FireflyField } from "./FireflyField";
import { HeroScene } from "./HeroScene";
// One definition of each poster, in the three-free module. The gated call sites
// render these WITHOUT loading the renderer; this module renders the same ones
// underneath a canvas. Two copies would drift, and the drift would only show on
// the devices least able to report it.
import { AmbientPoster } from "./posters";
import { ScalePoster } from "./ScalePoster";
import { SceneShell } from "./SceneShell";

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

/**
 * The site-wide firefly backdrop. One canvas, fixed to the viewport, behind
 * every section.
 *
 * `eager` because this is never off-screen — it IS the screen — so the
 * viewport gating that unmounts section scenes has nothing to gate on. The
 * flat orthographic-ish framing (wide FOV, camera on axis) keeps the field
 * even from edge to edge; a subject-scene camera would bunch the motes toward
 * the centre.
 *
 * Exposure 1.0: the shader already carries its own brightness budget in
 * uOpacity, and that number is bounded by the contrast gate rather than taste.
 */
export function FireflyCanvas() {
  return (
    <SceneShell
      eager
      camera={{ position: [0, 0, 6], fov: 60 }}
      exposure={1}
      poster={<div style={{ width: "100%", height: "100%" }} />}
    >
      {(capability) => <FireflyField capability={capability} />}
    </SceneShell>
  );
}

export function HeroCanvas() {
  return (
    <SceneShell
      eager
      showFallbackNotice
      camera={{ position: [1.35, 1.65, 7.4], fov: 34 }}
      /* 1.18, screenshot-verified: at 1.06 the forged-iron column and plinth
         disappeared into the void and the instrument read as a floating beam. */
      exposure={1.18}
      poster={<ScalePoster />}
    >
      {(capability) => <HeroScene capability={capability} />}
    </SceneShell>
  );
}

export function AssayCanvas() {
  return (
    <SceneShell
      camera={{ position: [0, 0.14, 3.1], fov: 30 }}
      exposure={1.12}
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
      exposure={1.1}
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

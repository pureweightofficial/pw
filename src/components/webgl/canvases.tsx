"use client";

import { AmbientScene, type AmbientVariant } from "./AmbientScene";
// One definition of each poster, in the three-free module. The gated call sites
// render these WITHOUT loading the renderer; this module renders the same ones
// underneath a canvas. Two copies would drift, and the drift would only show on
// the devices least able to report it.
import { AmbientPoster } from "./posters";
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

/*
  SpecimenCanvas stood here too, and went for a quieter reason than the other
  two: nothing called it. Its only mount was the valuation journey's left
  column, and that was retired when the persistent world came back — the
  specimen drew the SAME goldMassGeometry with the SAME massGold material the
  world's mass does, so keeping it meant two instances of one object on screen.

  Which leaves this module with a single export. Every canvas it once held is
  gone, and the gold on this site is now one world behind every page rather
  than four scenes inside four sections.
*/

/*
  AssayCanvas and FinaleCanvas lived here, with AssayPoster below them.

  Both were retired when the owner reviewed them on a real window and called
  them unreal items — the signet never read as jewellery however its material
  was tuned, and the closing balance was composed correctly at exactly one
  viewport height and crossed the CTA row at every shorter one.

  They are DELETED rather than commented out, because the obvious way to
  "bring the finale scene back" would have been to mount this again, and this
  file has carried that exact trap before (HeroCanvas, FireflyCanvas). The
  work is in git: see the commit that removed them.

  The gold on this site is now the persistent world, which renders behind
  every section rather than inside two of them.
*/

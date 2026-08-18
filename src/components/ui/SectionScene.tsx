"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSceneGate } from "@/lib/scene-gate";
import { AmbientPoster } from "@/components/webgl/posters";
import type { AmbientVariant } from "@/components/webgl/AmbientScene";

/**
 * SECTION AMBIENT SCENE
 *
 * Drops a quiet 3D backdrop behind a section. One line at the call site; every
 * hard problem is already solved underneath it.
 *
 * WHAT IT INHERITS FOR FREE, BY GOING THROUGH SceneShell
 *
 *   never blocks      the chunk is next/dynamic, ssr:false. Copy paints first.
 *   never renders unseen   frameloop stops entirely off-screen or backgrounded,
 *                     and the canvas UNMOUNTS when far away — which is what keeps
 *                     the browser's WebGL context limit from ever being reached
 *                     no matter how many sections use this.
 *   never fails loudly     error boundary plus a lost-context listener, both
 *                     falling back to a near-black poster.
 *   never overreaches      declined GPUs, software renderers, data-saver signals
 *                     and low tiers get the poster permanently.
 *   never leaks       geometry, materials and textures are reference-counted
 *                     across every scene and disposed with the last one.
 *
 * WHERE IT IS DELIBERATELY NOT USED
 *
 * The evidence table and the insight index. Both are there to be read, and a
 * moving backdrop behind a list of unfilled placeholders would be decoration
 * arguing with content. The 3D skill's first anti-pattern is 3D for its own sake,
 * and "every section" is exactly how that happens.
 */

const AmbientCanvas = dynamic(
  () => import("@/components/webgl/canvases").then((m) => m.AmbientCanvas),
  { ssr: false },
);

const SpecimenCanvas = dynamic(
  () => import("@/components/webgl/canvases").then((m) => m.SpecimenCanvas),
  { ssr: false },
);

export type SectionSceneProps = {
  variant: AmbientVariant;
  /**
   * How hard the scrim works.
   *
   *   veil    (default) heavy everywhere. Correct when the scene is pure
   *           atmosphere and the copy may sit anywhere over it.
   *   reveal  heavy on the LEFT where copy lives, clearing to the right so a
   *           presented object can actually be seen. Only safe in a section
   *           whose layout genuinely leaves that side empty — the journey
   *           section's right column does.
   */
  scrim?: "veil" | "reveal";
  /** Which scroll channel drives the parallax. Defaults to page progress. */
  channel?: "progress" | "journey" | "assay" | "finale";
  /**
   * Which scene fills the window. "ambient" is atmosphere behind copy;
   * "specimen" is the presented gold mass — the windowed-WebGL architecture's
   * first content scene, for the one slot whose layout genuinely presents an
   * object.
   */
  scene?: "ambient" | "specimen";
  className?: string;
};

export function SectionScene({
  variant,
  channel,
  scrim = "veil",
  scene = "ambient",
  className = "",
}: SectionSceneProps) {
  // Decided before the renderer is imported — see lib/scene-gate.
  const gate = useSceneGate();

  /*
    AMBIENT scenes stand down on the homepage; CONTENT scenes do not.

    The measurement that decided this: with the homepage's four ambient
    backdrops all mounting, the page peaked at 3 simultaneous canvases,
    62.7ms mean frame time and 42.8s of long-task time in one scroll. Ambient
    atmosphere is not worth that. The specimen is different in kind — it is
    the presented object of the journey section, mounted through SceneShell
    which unmounts it off-screen, and it renders wherever it is placed.

    (This guard once referred to "the world owning the backdrop"; the
    persistent world is unmounted and the honest reason is the one above.)
  */
  const pathname = usePathname();
  const ambientStoodDown = pathname === "/";

  return (
    <div
      aria-hidden="true"
      // -z-10 puts it behind the section's copy but IN FRONT of nothing else —
      // it lives inside the section's own opaque surface, which is why this works
      // at all. See the note in AmbientScene about why a single fixed canvas does
      // not: every section surface is opaque and would hide it.
      //
      // `section-scene` is a MARKER for scripts/check-section-scene-contrast.mjs,
      // not a style. The gate hides a section's copy while leaving the backdrop
      // stack visible, and it must recognise this host exactly. It used to treat
      // "any direct child containing the scrim" as backdrop, which broke the
      // moment the services opener wrapped scene and copy in one band: the gate
      // skipped the whole band, left the heading visible, and measured the
      // heading's own glyphs against themselves.
      className={`section-scene pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      {gate === "canvas" && scene === "specimen" ? (
        <SpecimenCanvas />
      ) : gate === "canvas" && !ambientStoodDown ? (
        <AmbientCanvas variant={variant} channel={channel} />
      ) : (
        <AmbientPoster />
      )}

      {/*
        THE SCRIM IS NOT OPTIONAL, WHICH IS WHY IT LIVES HERE AND NOT AT THE
        CALL SITE.

        The canvas sits between the section's opaque surface and its copy, so
        text renders directly over a LIT, MOVING scene. That is the ambient-glow
        problem again — a backdrop that lightens unpredictably, in places that
        change frame to frame — except brighter, because these are metals under a
        key light rather than a soft gradient.

        Putting the scrim inside the component means no section can adopt a scene
        and forget it. It is measured by scripts/check-section-scene-contrast.mjs,
        which samples the rendered backdrop in a real browser rather than
        reasoning about it.
      */}
      <div
        className="section-scene-scrim absolute inset-0"
        data-scrim={scrim}
      />
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
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
  className?: string;
};

export function SectionScene({
  variant,
  channel,
  scrim = "veil",
  className = "",
}: SectionSceneProps) {
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
      <AmbientCanvas variant={variant} channel={channel} />

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

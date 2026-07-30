/**
 * AMBIENT GOLD GLOW
 *
 * Soft round pools of gold light that drift very slowly behind a section.
 *
 * WHY THIS EXISTS
 *
 * Moving the ground to true #000000 and darkening the panel surfaces with it
 * removed the tonal variation that used to give sections depth. On a large dark
 * screen the result reads flat: the eye has nothing to fix on between one block of
 * copy and the next. Restoring depth by lifting the surfaces again would undo the
 * pure black; this puts the depth back as LIGHT instead, which is the correct move
 * for a brand whose entire material is reflective metal.
 *
 * WHY CSS AND NOT WEBGL
 *
 * Because it is two radial gradients. A canvas for this would mean a renderer, a
 * context, and a frame loop per section, for something the compositor does for
 * free. These animate `transform` and nothing else, so they run on the GPU and
 * never trigger layout or paint.
 *
 * WHY THE INTENSITY IS CAPPED, AND MEASURED
 *
 * A glow behind text LIGHTENS the background, which lowers contrast — silently,
 * and only in the places the glow happens to have drifted to. So the peak
 * composite of these layers is registered as a surface in
 * `scripts/check-contrast.mjs` and every text token is audited against it. The
 * alpha values below are not a taste decision; they are the largest values that
 * keep every token passing WCAG AA at the glow's brightest point.
 *
 * ACCESSIBILITY
 *
 * Under `prefers-reduced-motion: reduce` the glow stays and the drift stops. The
 * point is depth, not movement, and the still version delivers it — consistent
 * with how the rest of this site treats reduced motion, which is to present the
 * thing already at rest rather than to remove it.
 *
 * It is `aria-hidden` and `pointer-events: none` throughout: purely atmosphere,
 * never content, never an interaction target.
 */

export type AmbientGlowProps = {
  /**
   * How strongly the pools read.
   *
   *   soft    barely there — for sections that already have a WebGL scene or a
   *           photograph doing the visual work
   *   normal  the default
   *   warm    the most this palette can carry before text contrast is affected
   */
  intensity?: "soft" | "normal" | "warm";
  /**
   * Which corners the two pools favour. Varying this between adjacent sections is
   * what stops the page looking like the same gradient repeated down the screen.
   */
  placement?: "left" | "right" | "split" | "centre";
  className?: string;
};

export function AmbientGlow({
  intensity = "normal",
  placement = "split",
  className = "",
}: AmbientGlowProps) {
  return (
    <div
      aria-hidden="true"
      data-intensity={intensity}
      data-placement={placement}
      className={`ambient-glow pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      <span className="ambient-pool ambient-pool-a" />
      <span className="ambient-pool ambient-pool-b" />
    </div>
  );
}

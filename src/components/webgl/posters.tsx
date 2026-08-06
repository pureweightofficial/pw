/**
 * SCENE POSTERS — the still image behind every canvas, and the finished
 * article for anyone who will not be shown one.
 *
 * WHY THESE LIVE IN THEIR OWN MODULE.
 *
 * They are plain markup: a gradient, some CSS. Not one of them needs three.js.
 * But `AmbientPoster` used to be declared inside AmbientScene.tsx, and that
 * module imports the renderer at the top — so anything reaching for the poster
 * dragged 167KB (gzipped) of WebGL in behind it.
 *
 * That mattered because of where the decision to skip 3D is made. Capability is
 * read inside SceneShell, which lives on the far side of the `next/dynamic`
 * boundary, so a phone on 2g with Data Saver had to download the entire
 * renderer in order to discover it should not render. capability.ts states the
 * intent plainly — "respect an explicit data-saving signal by not
 * downloading/compiling the full scene" — and the split defeated it. Measured:
 * identical bytes on a capable desktop and on 2g + saveData, with no canvas on
 * the latter.
 *
 * Keeping the posters three-free lets the call sites answer "should this device
 * get 3D at all?" before importing anything, which is the only place that
 * question can be answered for free.
 */

export { ScalePoster } from "./ScalePoster";

/**
 * The ambient backdrop's still: a single warm bloom, low enough in contrast to
 * sit behind copy. Deliberately not a picture of the scene — the ambient
 * canvases are atmosphere, and a frozen frame of atmosphere reads as a
 * failed image rather than a designed surface.
 */
export function AmbientPoster() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: "100%",
        height: "100%",
        background:
          "radial-gradient(70% 55% at 30% 40%, rgba(184,121,20,0.07), transparent 70%)",
      }}
    />
  );
}

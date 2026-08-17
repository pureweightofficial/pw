"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSceneGate } from "@/lib/scene-gate";

/**
 * THE SITE-WIDE FIREFLY BACKDROP
 *
 * Mounted once, in the root layout, behind everything. Fixed to the viewport
 * rather than to the document, so the field is continuous across the whole
 * page instead of restarting at every section boundary.
 *
 * THIS COMPONENT IS ONLY HALF OF THE EFFECT.
 *
 * A canvas behind the page is invisible if the page is opaque, and until now
 * every section carried a solid near-black surface — the reason the codebase
 * previously recorded that a single fixed canvas "does not work here". The
 * other half is `--surface-alpha` in globals.css, which makes those surfaces
 * translucent so the field reads through them. Change one without the other
 * and you get either a blank backdrop or a page with no material identity.
 *
 * z-0 against the content's z-10, both inside the body's own black. Nothing
 * here is interactive and nothing here is announced: `pointer-events-none` so
 * it never eats a click, `aria-hidden` so it is not described to a screen
 * reader, which would be narrating decoration.
 *
 * ssr:false and `dynamic` for the same reason as every other scene: the ~600KB
 * renderer stays out of the initial bundle, and the hero copy is painted and
 * interactive long before a byte of WebGL is requested. Until it loads, the
 * page is exactly what it was before — black.
 */

const FireflyCanvas = dynamic(
  () => import("@/components/webgl/canvases").then((m) => m.FireflyCanvas),
  { ssr: false },
);

export function FireflyBackdrop() {
  // Decided before the renderer is imported — see lib/scene-gate.
  const gate = useSceneGate();

  /*
    NO BACKDROP CANVAS ON THE HOMEPAGE. This is a PERFORMANCE decision, and it
    is the one measurement that mattered most in this whole effort.

    A fixed full-viewport WebGL canvas underneath this page's large translucent
    section surfaces costs about 43fps. Measured on one machine, one build apart,
    scrolling the same homepage:

        no backdrop canvas   59.9fps   0 of 798 frames dropped   1.8s long tasks
        this firefly field   14.3fps   295 of 356 dropped       18.9s long tasks
        the gold world       17.1fps   273 of 315 dropped       26.7s long tasks

    The cost is structural, not scene content: stripping the environment map,
    the shadows, the physical material and half the pixel ratio moved it by
    about a frame. Any canvas here costs it; an empty page does not.

    So the field that shipped here for months was holding the homepage at 14fps.
    It stands down on "/" and every other page keeps it, because those pages are
    short and carry far less translucent surface.
  */
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {gate === "canvas" ? <FireflyCanvas /> : null}
    </div>
  );
}

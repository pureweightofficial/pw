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
    THE HOMEPAGE HAS ITS OWN WORLD NOW, so this stands down there.

    The persistent gold world (components/ui/GoldWorld) carries the weight →
    purity → market → value story, and that story only exists on the homepage:
    on /contact or /faq a scroll-driven gold narrative is decoration behind a
    form, and a second WebGL context behind the first is waste twice over.
    Every other page keeps the field it has always had.

    Decided by path rather than by a prop so the two backdrops cannot both be
    mounted by accident. Two lit layers would blow the contrast budget that
    --surface-alpha was measured against, and that failure would stay invisible
    until someone happened to run the gate.
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

"use client";

import dynamic from "next/dynamic";
import { useSceneGate } from "@/lib/scene-gate";

/**
 * THE PERSISTENT WORLD, MOUNTED ONCE.
 *
 * Fixed to the viewport rather than to the document, so the scene is continuous
 * across the whole page instead of restarting at every section boundary. It
 * lives behind the content at z-0; every section surface above it is
 * translucent (`--surface-alpha` in globals.css), which is what lets one world
 * show through twelve sections.
 *
 * WHY THE GATE IS HERE AND NOT INSIDE THE CANVAS.
 *
 * `useSceneGate` reads device capability WITHOUT importing three.js, so a phone
 * on a metered connection decides not to have a 3D scene before the renderer is
 * fetched rather than after. That distinction was worth 952KB when it was
 * measured; keeping the decision on this side of the `next/dynamic` boundary is
 * the only thing that preserves it, and `npm run check:3d-payload` fails if it
 * ever moves back.
 *
 * The fallback is not a picture of the scene. It is a deep vignette — the room
 * the object sits in, without the object. A frozen frame of a lit metal mass
 * looks like a scene that failed to start; darkness looks deliberate, and the
 * page above it is designed to carry itself.
 */

const WorldCanvas = dynamic(
  () => import("@/components/webgl/world/WorldCanvas").then((m) => m.WorldCanvas),
  { ssr: false },
);

export function GoldWorld() {
  const gate = useSceneGate();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/*
        Painted underneath the canvas, always. It is the ground the scene sits
        on when the scene is present, and the entire visual when it is not, so
        there is never a frame of flat black between the two states.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 62% 38%, rgba(185,139,60,0.075), transparent 62%)," +
            "radial-gradient(80% 60% at 20% 80%, rgba(20,26,38,0.5), transparent 70%)",
        }}
      />
      {gate === "canvas" ? <WorldCanvas /> : null}
    </div>
  );
}

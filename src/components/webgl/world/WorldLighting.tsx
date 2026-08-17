"use client";

import { Environment } from "@react-three/drei";
import { useMemo } from "react";
import { BackSide, Color } from "three";
import type { Capability } from "@/lib/capability";
import { studioEnvMap } from "../textures";

/**
 * LIGHTING IS THE MATERIAL.
 *
 * Gold has no colour of its own worth speaking of — it is a mirror with a warm
 * bias. What makes rendered gold look like gold rather than like yellow plastic
 * is almost entirely what it has to reflect. So the largest thing in this file
 * is a room.
 *
 * WHAT THE PREVIOUS RIG DID WRONG, MEASURED RATHER THAN GUESSED.
 *
 * It was a near-black cube containing five drei `<Lightformer form="rect">`
 * panels. Rendered, the mass came back as a black lump carrying roughly eight
 * flat, hard-edged, uniformly-filled khaki patches — reviewers called it
 * camouflage. Three separate geometry fixes had already been aimed at those
 * patches and none of them moved. They were never geometry: swapping the gold
 * for MeshNormalMaterial, which draws pure surface orientation with no lighting
 * at all, returns one continuous perfectly smooth form with no facets anywhere.
 *
 * The patches were the panels, mirrored, for two compounding reasons:
 *
 *  1. THE METAL WAS A MIRROR. `roughness: 0.26` multiplied by a roughness map
 *     that outputs 0.13–0.34 gives a true roughness around 0.05. At 0.05 a
 *     rectangle reflects as a rectangle. It is fixed in the material.
 *  2. THE PANELS WERE STEP FUNCTIONS ON BLACK. Full radiance inside a straight
 *     edge, nothing outside it, nothing at all in the 95% of directions with no
 *     panel in them. Every reflected value was therefore either clipped white
 *     or zero — a two-tone image, which is what a flat plate with one uniform
 *     fill actually is.
 *
 * So there are no light panels here any more. The room is a single painted
 * equirectangular shell (see `studioEnvMap`) in which every emitter is a
 * feathered radial bloom and every direction returns a value: cool skylight
 * overhead, a warm lifted horizon, a dark floor. There is no edge left in the
 * environment for the metal to find.
 *
 * HDR FROM AN LDR CANVAS. The shell's basic material is given a `color`
 * brighter than white, which multiplies the map. drei renders this portal into
 * a half-float cube target with tone mapping off, so values above 1 survive —
 * that is what makes the key a highlight rather than a grey patch, without ever
 * introducing a hard boundary.
 *
 * There is deliberately no bloom. Bloom is the usual substitute for lighting
 * you have not done.
 */

export function WorldLighting({ capability }: { capability: Capability }) {
  const high = capability.tier === "high";
  const room = useMemo(() => studioEnvMap(), []);

  /*
    The exposure of the room itself. Above 1 in every channel: this is the
    single HDR control, and it is what decides whether the gold reads as lit or
    as merely visible. Slightly lower on weak tiers because they render into a
    128px cube whose mips blur less predictably.
  */
  const roomGain = useMemo(() => new Color(high ? 3.2 : 2.8, high ? 3.05 : 2.66, high ? 2.9 : 2.5), [high]);

  return (
    <>
      {/*
        Fog is doing structural work, not atmosphere: it is what makes the room
        feel larger than the frame. The far plane sits just past the object, so
        anything behind it dissolves and the visitor cannot find the edges of
        the space — which is the brief's "never clearly expose an entire room".
      */}
      <fog attach="fog" args={["#070707", 6.5, 19]} />

      {/*
        Near nothing, and it is not doing what it looks like it is doing: a
        metal has no diffuse term, so ambient light never touches the mass. It
        exists for the weighing platform, which is not metal.
      */}
      <ambientLight intensity={0.14} color="#171310" />

      <Environment resolution={high ? 256 : 128} frames={1}>
        {/*
          THE ROOM. One inverted sphere carrying the painted studio. Rendered
          from the inside, so its own geometry is never a silhouette — only its
          gradient reaches the metal.
        */}
        <mesh scale={30}>
          <sphereGeometry args={[1, 48, 32]} />
          <meshBasicMaterial
            map={room}
            color={roomGain}
            side={BackSide}
            toneMapped={false}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      </Environment>

      {/*
        THE ONE REAL LIGHT, and the only shadow caster. On a metal a direct
        light contributes specular only, so this is not "the key" in the usual
        sense — the room is the key. This is the tight secondary glint that
        keeps a crown edge crisp, plus the shadow that seats the mass.
      */}
      <directionalLight
        position={[-2.6, 5.2, 3.1]}
        intensity={1.15}
        color="#fff2e2"
      />

      {/*
        A cool counter-glint from behind right, on the same axis as the room's
        warm rim. Two specular lobes of different temperature crossing a curved
        surface is most of what separates metal from a warm gradient.
      */}
      <directionalLight position={[4.4, 1.6, -3.6]} intensity={0.7} color="#9fb4d0" />
    </>
  );
}

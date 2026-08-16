"use client";

import { Environment, Lightformer } from "@react-three/drei";
import type { Capability } from "@/lib/capability";

/**
 * LIGHTING IS THE MATERIAL.
 *
 * Gold has no colour of its own worth speaking of — it is a mirror with a warm
 * bias. What makes rendered gold look like gold rather than like yellow plastic
 * is almost entirely what it has to reflect, which is why the largest part of
 * this file is a set of shapes floating in the dark whose only job is to be
 * reflected.
 *
 * Three sources, and each has one job:
 *
 *   KEY        large, soft, neutral. Defines the form. Everything else is
 *              subordinate to it and none of the others cast the primary shadow.
 *   WARM RIM   narrow and hot, raking from behind. This is the single line of
 *              light that separates the mass from the black behind it, and it
 *              is what makes the object read as premium rather than merely lit.
 *   COOL FILL  barely there. Without it the shadow side clips to dead black and
 *              the object loses its volume; with too much of it, the scene
 *              turns grey and stops feeling expensive.
 *
 * There is deliberately no bloom. The brief is right that bloom is the usual
 * substitute for lighting you have not done, and on a metal this rough it would
 * smear exactly the flecked highlight the roughness map exists to create.
 */

export function WorldLighting({ capability }: { capability: Capability }) {
  const high = capability.tier === "high";

  return (
    <>
      {/*
        Fog is doing structural work, not atmosphere: it is what makes the room
        feel larger than the frame. The far plane sits just past the object, so
        anything behind it dissolves and the visitor cannot find the edges of
        the space — which is the brief's "never clearly expose an entire room".
      */}
      <fog attach="fog" args={["#070707", 6.5, 19]} />

      {/* Just off black. Zero ambient means the shadow side is a silhouette. */}
      <ambientLight intensity={0.14} color="#171310" />

      <Environment resolution={high ? 256 : 128} frames={1}>
        {/* The room itself: near black, so the metal has somewhere to be dark. */}
        <color attach="background" args={["#050505"]} />

        {/*
          KEY. Wide and soft and high, slightly to the left. A large emitter is
          what produces the long gradient down a curved metal surface; a small
          one produces a dot, which is the giveaway of a cheap render.
        */}
        <Lightformer
          form="rect"
          intensity={2.5}
          position={[-3.2, 4.4, 3.6]}
          rotation={[-0.5, -0.35, 0]}
          scale={[9, 6, 1]}
          color="#fff6e8"
        />

        {/*
          WARM RIM. Narrow, behind and to the right, hot enough to blow out
          slightly along the crown's edge. This is the most important single
          light in the scene for making gold look like gold.
        */}
        <Lightformer
          form="rect"
          intensity={high ? 6.5 : 5.2}
          position={[3.6, 1.9, -3.4]}
          rotation={[0.2, 2.4, 0]}
          scale={[5.5, 1.1, 1]}
          color="#ffcf8a"
        />

        {/*
          COOL FILL, from below and behind the camera. Cool because a warm fill
          on a warm key flattens everything into one temperature; the slight
          blue is what keeps the shadow side reading as a separate plane.
        */}
        <Lightformer
          form="rect"
          intensity={0.85}
          position={[2.2, -2.4, 3.2]}
          rotation={[0.9, 0.4, 0]}
          scale={[6, 3.4, 1]}
          color="#8fa6c4"
        />

        {/*
          REFLECTION CARDS. These are never seen directly. They exist so the
          curved surfaces have recognisable straight-edged gradients running
          across them — the visual language of a studio, and the thing that
          separates "photographed" from "rendered".
        */}
        {high ? (
          <>
            <Lightformer
              form="rect" intensity={1.4}
              position={[-4.6, 0.4, -2.2]} rotation={[0, -1.1, 0]}
              scale={[3.2, 4.5, 1]} color="#e8dcc8"
            />
            <Lightformer
              form="rect" intensity={1.1}
              position={[0, 5.2, -4.5]} rotation={[1.3, 0, 0]}
              scale={[7, 3, 1]} color="#d8cdbb"
            />
          </>
        ) : null}
      </Environment>

      {/*
        The only real-time light, and the only shadow caster. One shadow, from
        the same direction as the key, is enough to ground the mass; a second
        would double the cost to say something the first already said.
      */}
      <directionalLight
        position={[-2.6, 5.2, 3.1]}
        intensity={1.5}
        color="#ffeedd"
        castShadow={capability.shadows}
        shadow-mapSize-width={high ? 1024 : 512}
        shadow-mapSize-height={high ? 1024 : 512}
        shadow-camera-near={1}
        shadow-camera-far={14}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0012}
      />
    </>
  );
}

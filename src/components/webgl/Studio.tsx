'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { BackSide } from 'three';
import type { Capability } from '@/lib/capability';

/**
 * THE LIGHTING RIG — a private assay room, not a product studio
 *
 * Low-key three-point lighting on a near-black set. The whole look rests on one
 * counter-intuitive rule: **most of a polished gold surface is reflected
 * darkness.** If you flood it, it turns into flat yellow plastic. So the room is
 * black, and gold is described by a handful of small, precisely-placed bright
 * shapes that it reflects.
 *
 *   KEY    a large warm rectangle, high and to the left. Does the modelling.
 *   RIM    a narrow strip behind and right — slightly cool, at low intensity.
 *          The cool cast is what separates the instrument from the background
 *          and stops the frame going monochrome-amber.
 *   BOUNCE a dim ring below, catching pan undersides and the plinth chamfers.
 *
 * The environment is baked into a 256px cubemap on the first frame and never
 * re-rendered — the lights never move, so paying for them every frame would be
 * pure waste.
 */

type StudioProps = {
  capability: Capability;
  /** Slightly tighter, warmer rig for the macro/finale scenes. */
  intimate?: boolean;
};

export function Studio({ capability, intimate = false }: StudioProps) {
  const shadows = capability.shadows;
  const shadowRes = capability.tier === 'high' ? 1024 : 512;

  return (
    <>
      {/* Depth: everything past the instrument dissolves into the room. */}
      <fog attach="fog" args={['#030303', 5.4, intimate ? 12 : 17]} />

      {/* Just enough ambient to keep deep shadows from clipping to pure black. */}
      <ambientLight intensity={0.16} color="#1c1611" />

      <Environment resolution={256} frames={1}>
        {/* The room itself: a dark shell so metal reflects something, not void. */}
        <mesh scale={26}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color="#060505" side={BackSide} />
        </mesh>

        {/* KEY — broad, warm, upper left front. */}
        <Lightformer
          form="rect"
          intensity={intimate ? 3.4 : 2.6}
          color="#ffd9a2"
          position={[-4.2, 4.6, 3.4]}
          rotation={[0, -0.42, 0]}
          scale={[6, 4.2, 1]}
        />

        {/* A tighter hot core inside the key, for the specular highlight. */}
        <Lightformer
          form="rect"
          intensity={intimate ? 5.2 : 4.2}
          color="#fff2d6"
          position={[-2.6, 3.4, 2.4]}
          rotation={[0, -0.5, 0]}
          scale={[1.5, 1.9, 1]}
        />

        {/* RIM — narrow, cool, behind right. Carves the silhouette out. */}
        <Lightformer
          form="rect"
          intensity={1.5}
          color="#7f8ea6"
          position={[4.4, 2.4, -3.2]}
          rotation={[0, 1.16, 0]}
          scale={[1.1, 5.2, 1]}
        />

        {/* BOUNCE — dim warm ring below, for pan undersides and chamfers. */}
        <Lightformer
          form="ring"
          intensity={0.85}
          color="#c98f2c"
          position={[0.8, -2.2, 2.6]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={4.5}
        />

        {/* A long vertical strip that travels as a highlight down the column. */}
        <Lightformer
          form="rect"
          intensity={1.1}
          color="#f2ce72"
          position={[1.9, 1.4, 3.6]}
          rotation={[0, 0.28, 0]}
          scale={[0.34, 4.4, 1]}
        />
      </Environment>

      {/*
        One real, shadow-casting key. The environment does the reflections; this
        does the *shadow*, which is what actually seats the instrument on the
        bench. Physically-correct falloff (decay 2) means the intensity value is
        in candela and looks large by design.
      */}
      <spotLight
        position={[-3.4, 5.6, 3.2]}
        angle={0.52}
        penumbra={0.92}
        decay={2}
        distance={18}
        intensity={intimate ? 165 : 128}
        color="#ffdca8"
        castShadow={shadows}
        shadow-mapSize-width={shadowRes}
        shadow-mapSize-height={shadowRes}
        shadow-bias={-0.0009}
        shadow-normalBias={0.022}
        shadow-camera-near={1}
        shadow-camera-far={16}
      />

      {/* Cool counter-light. Non-shadowing, cheap, and does half the work of
          making the gold read as metal rather than as a warm gradient. */}
      <directionalLight position={[5.2, 2.6, -4.4]} intensity={0.55} color="#8ea0b8" />

      {/* A low warm kick from the front-right to keep the near edge alive. */}
      <pointLight position={[2.6, 0.4, 2.8]} intensity={7} decay={2} distance={9} color="#b98220" />
    </>
  );
}

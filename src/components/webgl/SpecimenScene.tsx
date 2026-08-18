"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Capability } from "@/lib/capability";
import { damp, scrollState } from "@/lib/scroll-store";
import { goldMassGeometry } from "./geometry";
import { massGold } from "./materials";
import { Studio } from "./Studio";

/**
 * THE SPECIMEN — raw gold, presented.
 *
 * The first windowed scene built from the persistent world's parts: the same
 * procedural mass, the same shared massGold() material, framed inside the
 * valuation journey's presented-object slot instead of drifting behind the
 * whole page. This is the overhaul's windowed-WebGL architecture in one
 * component: 3D as CONTENT, mounted through SceneShell, appearing exactly
 * where the copy is talking about the thing it shows.
 *
 * It sits in the journey section — the four steps of having gold valued — as
 * the object those steps happen TO. The journey channel drives it: as the
 * visitor moves through the steps, the specimen settles and turns its machined
 * flat toward the lens, the same telling-the-story-with-the-object language
 * the world's chapter choreography used.
 *
 * MOTION RULES, inherited from the mass's design language: it never spins,
 * never bobs, never springs. Damped targets only. Reduced motion pins it at
 * its resting pose — present, lit, and still.
 */
export function SpecimenScene({ capability }: { capability: Capability }) {
  const group = useRef<THREE.Group>(null);
  const geo = useMemo(() => goldMassGeometry(), []);
  const material = useMemo(() => massGold(), []);

  const state = useRef({ rotY: 0, y: 0, seeded: false });

  useFrame((_, delta) => {
    if (!group.current) return;

    /*
      The journey channel runs 0→1 across the section. The specimen starts
      slightly raised and yawed away, and settles level and presented as the
      visitor reads the steps — arriving, like the camera marks, in the first
      half so it HOLDS its pose while the later steps are read.
    */
    const t = Math.min(1, scrollState.journey * 1.8);
    const eased = t * t * (3 - 2 * t);
    const targetRotY = THREE.MathUtils.degToRad(-26 + eased * 22);
    const targetY = THREE.MathUtils.lerp(0.16, -0.05, eased);

    if (!state.current.seeded || capability.reducedMotion) {
      // First frame, and every frame under reduced motion: no glide to watch.
      state.current.rotY = targetRotY;
      state.current.y = targetY;
      state.current.seeded = true;
    } else {
      state.current.rotY = damp(state.current.rotY, targetRotY, 1.2, delta);
      state.current.y = damp(state.current.y, targetY, 1.2, delta);
    }

    // Pointer: the same below-conscious-notice influence as the world's mass.
    const px = capability.reducedMotion ? 0 : scrollState.pointerX;
    group.current.rotation.y = state.current.rotY + px * 0.03;
    group.current.position.y = state.current.y;
  });

  return (
    <group>
      <Studio capability={capability} intimate />
      {/*
        Seated RIGHT of frame and small, because this canvas fills the whole
        journey section behind its copy — it is a backdrop slot, not a product
        viewer. The first framing (scale 0.78, centred, camera at z 3.4) put
        the lens practically inside the mass: it rendered as a giant golden
        smear across the copy column. Same lesson as the world's composition:
        the object lives where the layout's reveal scrim clears, and the copy
        never has metal behind it.
      */}
      {/* Outer group: static placement. Inner: the ONLY node useFrame touches.
          One group for both is the double-write trap GoldMass documented —
          the per-frame position.y assignment silently erases the offset. */}
      <group scale={0.42} position={[1.35, -0.25, 0]}>
        <group ref={group}>
          <mesh geometry={geo} material={material} />
        </group>
      </group>
    </group>
  );
}

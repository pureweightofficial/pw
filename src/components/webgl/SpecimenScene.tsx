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

  const state = useRef({ rotY: 0, rotX: 0, y: 0, scale: 1, seeded: false });

  useFrame((_, delta) => {
    if (!group.current) return;

    /*
      SCROLL TURNS THE OBJECT, ACROSS THE WHOLE SECTION.

      The previous curve ran `min(1, journey * 1.8)` and eased to a stop — the
      specimen finished all of its movement inside the first 55% of the
      section and then held a fixed pose for the remaining 45%, on top of a
      canvas whose framing meant it was only on screen for part of that. Two
      independent reasons for the same verdict: a gold stone that isn't moving.

      Now the turn is LINEAR IN SCROLL and spans the entire range: 168° of yaw
      from entry to exit, so the machined flat sweeps into view, presents
      itself square to the lens around the middle of the section, and carries
      on turning as the last steps are read. Scroll is the crank; the object
      is on the end of it. Stop scrolling and it stops — which is the honest
      signal that this is being driven, not looping.
    */
    const p = scrollState.journey;

    const targetRotY = THREE.MathUtils.degToRad(-38 + p * 150);
    // A gentle nod through the middle: the piece tips its face up as it
    // presents, then settles back. Sine, so both ends are motionless.
    const targetRotX = THREE.MathUtils.degToRad(
      -4 + Math.sin(p * Math.PI) * 11,
    );
    /*
      TRAVEL, PLUS AN EXIT THAT FIGHTS THE SLAB.

      A sticky element stops sticking once its container's bottom reaches it,
      and then rides up with the page. This canvas is one viewport inside a
      ~2,000px section, so it un-sticks with roughly a third of the section
      still to scroll and climbs about a full world unit — carrying the
      specimen up and out through the top of the frame.

      Clearing the navigation (see SectionScene) stops it being clipped by the
      bar, but it was still the wrong exit: an object that has been presented
      for four steps should settle out of frame, not escape upward past the
      reader. So past 70% the specimen is driven down by up to 1.15 units,
      which is about what the slab climbs. Net: it sinks out of the bottom of
      its window as the last step is read.
    */
    const exit = Math.max(0, (p - 0.7) / 0.3);
    const targetY =
      THREE.MathUtils.lerp(-0.12, 0.12, p) - exit * exit * 1.15;
    // Breathes 5% larger at the moment of presentation. Barely nameable,
    // clearly felt — the same trick a camera push does in film.
    const targetScale = 1 + Math.sin(p * Math.PI) * 0.05;

    if (!state.current.seeded || capability.reducedMotion) {
      // First frame, and every frame under reduced motion: no glide to watch.
      state.current.rotY = targetRotY;
      state.current.rotX = targetRotX;
      state.current.y = targetY;
      state.current.scale = targetScale;
      state.current.seeded = true;
    } else {
      /*
        DAMPING IS 5, NOT 1.2. At 1.2 the object lagged the scroll by most of a
        second, which reads as drift — an object doing its own slow thing near
        a page that happens to be scrolling. At 5 it tracks closely enough that
        the causal link is unmistakable while still absorbing the wheel's
        stair-stepping into a continuous turn.
      */
      state.current.rotY = damp(state.current.rotY, targetRotY, 5, delta);
      state.current.rotX = damp(state.current.rotX, targetRotX, 5, delta);
      state.current.y = damp(state.current.y, targetY, 5, delta);
      state.current.scale = damp(state.current.scale, targetScale, 5, delta);
    }

    /*
      POINTER: 0.16 rad of yaw and 0.07 of pitch at full deflection, against
      the 0.03 this used to have. The old figure was inherited from a
      full-page ambient backdrop, where influence had to stay below conscious
      notice; this is a presented object in a window the visitor is looking
      straight at, and it should answer the mouse plainly enough to invite a
      second wiggle.
    */
    const px = capability.reducedMotion ? 0 : scrollState.pointerX;
    const py = capability.reducedMotion ? 0 : scrollState.pointerY;
    group.current.rotation.y = state.current.rotY + px * 0.16;
    group.current.rotation.x = state.current.rotX + py * 0.07;
    group.current.position.y = state.current.y;
    group.current.scale.setScalar(state.current.scale);
  });

  return (
    <group>
      <Studio capability={capability} intimate />
      {/*
        FRAMED FOR THE COLUMN THAT IS ACTUALLY EMPTY.

        The canvas is one viewport tall and sticky (see SectionScene), so this
        is finally a composition rather than a gamble on which slice of a
        2,000px canvas the viewport happens to be showing.

        The specimen sits in the LEFT column, beneath the balance indicator,
        where the grid leaves four columns of void for the height of four
        stages. It was previously parked on the right, underneath the stage
        list, on the strength of a comment claiming the right column was the
        empty one — so every attempt to scale it up to visibility also drove
        metal behind the copy. Scale and position below are sized to that
        column: clear of the indicator above, clear of the stage text to the
        right, with margin at the frame edge.
      */}
      {/*
        SIZED TO THE COLUMN, ARITHMETICALLY.

        Camera fov 30 at z 5.6 gives 3.0 world units of height; at 16:9 that
        is 4.8 across, so one world unit is 300px on a 1440px screen. The
        grid's left column runs screen x 48-470, i.e. world -2.24 to -0.83 —
        1.41 units wide. The mass geometry is 2.68 units across at scale 1, so
        anything above scale 0.52 is wider than the column it is supposed to
        sit in, which is precisely how the previous two attempts ended up with
        gold behind the stage text.

        SIZE FOR THE ROTATED EXTENT, NOT THE RESTING ONE. The mass is 2.68
        units on its long axis and 2.12 on its short one, so a scale chosen
        against the resting half-width is wrong by 28% the moment the object
        turns broadside — which it does, on purpose, in the middle of the
        section. The bounding figure is the diagonal, 1.71 half-extent: at
        scale 0.45 that is 0.77 units, 231px, so the object stays inside
        screen x 39-501 through the whole turn with the stage list starting at
        517.

        Sunk to -0.30 rather than centred, because the sticky canvas bottoms
        out in the section's last third and rides up with its tail; starting
        low means the exit carries it out of frame instead of up behind the
        navigation bar.
      */}
      <group scale={0.45} position={[-1.5, -0.3, 0]}>
        <group ref={group}>
          <mesh geometry={geo} material={material} />
        </group>
      </group>
    </group>
  );
}

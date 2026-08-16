"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Capability } from "@/lib/capability";
// chapterWindow returns with the platform — see the note in useFrame below.
import { progressThrough } from "@/lib/chapters";
import { damp, scrollState } from "@/lib/scroll-store";
import { goldMassGeometry, weighPlatformGeometry } from "../geometry";
import { goldRoughnessMap } from "../textures";
import { instrumentPlate } from "../materials";

/**
 * THE ONE OBJECT.
 *
 * Everything the site says is said about this. It is never destroyed, never
 * swapped for a different mesh, and never duplicated — the visitor sees the
 * same lump of metal from the first frame to the last, which is the point the
 * brief makes hardest: continuity is what separates a story from a slideshow.
 *
 * MASS IS COMMUNICATED BY WHAT IT REFUSES TO DO.
 *
 * It does not spin. It does not bob. It does not spring. Across the entire
 * document it rotates a few degrees and translates less than its own width,
 * and it arrives at every position by deceleration rather than by easing curve.
 * A heavy object is one that is difficult to start and difficult to stop, so
 * the motion here is exponential damping toward a target — the same maths a
 * real damped mass obeys — rather than a keyframed tween.
 */

/**
 * Gold is not a colour. It is a metal with an extremely low roughness floor and
 * a strong dependence on what is around it, which is why this material is
 * defined almost entirely by `metalness: 1` plus an environment, and why the
 * lighting rig matters more than any value set here.
 *
 * The roughness MAP is the difference between metal and plastic: a constant
 * roughness gives a single clean highlight that slides across the surface like
 * a lit balloon. The procedural map breaks that highlight into the flecked,
 * uneven glitter that real cast gold has, and it is the same map the balance
 * uses, so the two objects are made of the same stuff.
 */
function useGoldMaterial(capability: Capability) {
  return useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#bf9a52"),
      metalness: 1,
      // Not 0. Mirror-perfect gold reads as chrome tinted yellow; real bullion
      // scatters enough to show its form rather than only its surroundings.
      roughness: 0.26,
      roughnessMap: goldRoughnessMap(),
      envMapIntensity: capability.tier === "high" ? 1.25 : 1.05,
    });
    return mat;
  }, [capability.tier]);
}

export function GoldMass({ capability }: { capability: Capability }) {
  const group = useRef<THREE.Group>(null);
  const mass = useRef<THREE.Mesh>(null);
  const platform = useRef<THREE.Group>(null);
  const material = useGoldMaterial(capability);
  const plate = useMemo(() => instrumentPlate(), []);

  const geo = useMemo(() => goldMassGeometry(), []);
  const platformGeo = useMemo(() => weighPlatformGeometry(), []);

  // Live state, held in refs so nothing here ever triggers a React render.
  const state = useRef({ y: 0, rotY: 0, rotX: 0, px: 0, py: 0 });

  useFrame((_, delta) => {
    if (!group.current || !mass.current) return;
    const p = scrollState.progress;

    /*
      HEIGHT. The mass begins high and slightly out of frame, descends through
      the weight chapter until it rests on the platform, and stays down. It
      never rises again: gold that has been weighed does not float back up, and
      the stillness of the last chapters is what makes them read as resolved.
    */
    const settle = progressThrough("weight", p);
    // Cubic ease-out: fast while falling, almost stopped at contact. This is the
    // curve of something heavy arriving, not something light landing.
    const eased = 1 - Math.pow(1 - settle, 3);
    const restY = -0.28;
    const targetY = THREE.MathUtils.lerp(1.15, restY, eased);

    /*
      ROTATION. Eight degrees, total, across the whole page — the brief's
      ceiling, and it is generous. Most of it is spent turning the machined flat
      toward the camera for the purity chapter, so the one rotation the visitor
      gets is the one that shows them something.
    */
    const toPurity = progressThrough("purity", p);
    const targetRotY = THREE.MathUtils.degToRad(-4 + toPurity * 8);
    const targetRotX = THREE.MathUtils.degToRad(settle * 2.5);

    // Pointer influence: tiny, damped, and deliberately below conscious notice.
    // Mapping the cursor straight to rotation is what makes a scene feel like a
    // toy; this is closer to the object being lit from where you are standing.
    const px = scrollState.pointerX;
    const py = scrollState.pointerY;
    state.current.px = damp(state.current.px, px, 2.2, delta);
    state.current.py = damp(state.current.py, py, 2.2, delta);

    // 1.4 is a slow damping constant — roughly a second to close most of the
    // gap. Raising it is the fastest way to make several kilograms feel like a
    // beach ball, so it is deliberately the lowest value that still tracks.
    state.current.y = damp(state.current.y, targetY, 1.4, delta);
    state.current.rotY = damp(state.current.rotY, targetRotY, 1.1, delta);
    state.current.rotX = damp(state.current.rotX, targetRotX, 1.1, delta);

    group.current.position.y = state.current.y;
    group.current.position.x = state.current.px * 0.07;
    group.current.rotation.y = state.current.rotY + state.current.px * 0.02;
    group.current.rotation.x = state.current.rotX - state.current.py * 0.012;

    /*
      THE PLATFORM'S REACTION. When the mass lands, the platform gives by a
      fraction of a millimetre and recovers. It is far too small to see as
      movement and that is correct — it is felt as the surface acknowledging a
      load, which is the difference between an object resting on a plane and an
      object intersecting one.
    */
    if (platform.current) {
      /*
        HELD BACK, DELIBERATELY, AND NOT DELETED.

        Rendered, this read as two large flat khaki plates cutting across the
        frame — a dull disc caught at a grazing angle, competing with the object
        it exists to support. It needs its own pass: it is currently lit by a
        rig tuned entirely for gold, and its form reads as a plate rather than
        an instrument surface.

        Shipping it in that state would make the page worse than no platform at
        all, so it is off. The geometry, the placement and the settle-response
        are wired and correct; only the look is unfinished. Restore by swapping
        in the commented expression.
      */
      const shown = 0;
      // chapterWindow("weight", p, 0.22) + chapterWindow("purity", p, 0.3) * 0.6
      platform.current.visible = shown > 0.01;
      const give = eased * 0.004;
      platform.current.position.y = restY - 0.52 - give;
      const s = Math.min(1, shown);
      platform.current.scale.setScalar(0.9 + s * 0.1);
      (platform.current.children[0] as THREE.Mesh | undefined)?.scale.setScalar(1);
    }
  });

  return (
    <group>
      {/*
        Two nested groups, deliberately. The OUTER one is static placement —
        right of centre and scaled to roughly half the frame — and the INNER one
        is the only thing useFrame touches. Writing both to one group means the
        per-frame position assignment silently erases the offset, which is a
        bug that presents as "the composition ignores its own layout".

        The placement itself comes from the brief: the copy column lives on the
        left and must never have metal behind it, and an object centred in frame
        reads as a product configurator rather than a photograph. Letting it run
        off the right edge is what makes the world feel bigger than the viewport.
      */}
      <group position={[0.92, 0, 0]} scale={0.63}>
        <group ref={group}>
          <mesh ref={mass} geometry={geo} material={material} castShadow receiveShadow />
        </group>
      </group>

      {/* The instrument the gold is measured on. Present only while it is
          relevant; a weighing platform under the final CTA would be scenery. */}
      <group position={[0.92, 0, 0]} scale={0.63}>
        <group ref={platform} visible={false}>
          <mesh geometry={platformGeo} material={plate} receiveShadow />
        </group>
      </group>
    </group>
  );
}
